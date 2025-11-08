import json
import os
import boto3
from botocore.exceptions import ClientError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import gspread # Googleスプレッドシート操作ライブラリ

# --- Googleスプレッドシートへの書き込み処理 ---
def write_to_spreadsheet(data):
    """Secrets Managerから認証情報を取得し、スプレッドシートにデータを書き込む"""
    # Lambdaの環境変数から設定値を取得
    secret_name = os.environ.get('SECRET_NAME')
    spreadsheet_key = os.environ.get('SPREADSHEET_KEY')
    worksheet_name = os.environ.get('WORKSHEET_NAME')

    try:
        # 1. Secrets Managerから認証情報を取得
        session = boto3.session.Session()
        client = session.client(service_name='secretsmanager')
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
        secret = json.loads(get_secret_value_response['SecretString'])

        # 2. 認証情報を使ってGoogleスプレッドシートに接続
        gc = gspread.service_account_from_dict(secret)
        spreadsheet = gc.open_by_key(spreadsheet_key)
        worksheet = spreadsheet.worksheet(worksheet_name)

        # 3. スプレッドシートに書き込む行データを作成（カラムの順序に合わせる）
        new_row = [
            data.get('name'),
            data.get('kana'),
            data.get('attendance'),
            data.get('email'),
            data.get('allergy', ''), # or '記載なし' でも可
            data.get('message', '')  # or '記載なし' でも可
        ]

        # 4. 新しい行としてデータを末尾に追加
        worksheet.append_row(new_row)
        
        return True, "Successfully wrote to spreadsheet"
        
    except Exception as e:
        # エラー内容をログに出力しておくとデバッグに役立ちます
        print(f"Spreadsheet write error: {e}")
        return False, str(e)


# --- (ここから下は元のメール送信コード) ---
def normalize_attendance(value: str) -> str:
    """フォームからの多様な値を『ご出席/ご欠席/未選択』に正規化する"""
    if not value:
        return "未選択"
    v = str(value).strip().lower()
    present_keys = {'attend', 'present', 'yes', 'true', 'ご出席', '出席', '参加'}
    absent_keys = {'absent', 'no', 'false', 'ご欠席', '欠席', '不参加'}
    if v in present_keys:
        return "ご出席"
    if v in absent_keys:
        return "ご欠席"
    # 日本語そのままが来た場合のフォールバック
    if value in ['ご出席', '出席', '参加']:
        return "ご出席"
    if value in ['ご欠席', '欠席', '不参加']:
        return "ご欠席"
    return "未選択"


def create_email_body(data):
    """メール本文を生成する"""
    attendance = normalize_attendance(data.get('attendance'))
    
    body = f"""
結婚式の出欠回答が届きました。

お名前: {data.get('name')}
ふりがな: {data.get('kana')}
出欠: {attendance}
メールアドレス: {data.get('email')}

アレルギー:
{data.get('allergy') or '記載なし'}

メッセージ:
{data.get('message') or '記載なし'}
    """
    return body.strip()

def send_email(data):
    """SESを使用してメールを送信する"""
    sender = os.environ.get('SENDER_EMAIL')
    recipient = os.environ.get('RECIPIENT_EMAIL')
    aws_region = os.environ.get('AWS_REGION', 'ap-northeast-1')
    attendance = normalize_attendance(data.get('attendance'))

    msg = MIMEMultipart()
    msg['Subject'] = f"結婚式出欠回答: {data.get('name')}様 ({attendance})"
    msg['From'] = sender
    msg['To'] = recipient
    msg.attach(MIMEText(create_email_body(data), 'plain', 'utf-8'))

    try:
        client = boto3.client('ses', region_name=aws_region)
        response = client.send_raw_email(
            Source=sender,
            Destinations=[recipient],
            RawMessage={'Data': msg.as_string()}
        )
        return True, response['MessageId']
    except ClientError as e:
        print(f"Email send error: {e}")
        return False, str(e.response['Error'])


# --- メインハンドラー (修正済み) ---
def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    try:
        data = json.loads(event.get('body', '{}'))

        # バリデーション
        required_fields = ['name', 'kana', 'email', 'attendance']
        if not all(field in data and data[field] for field in required_fields):
            missing = [field for field in required_fields if not data.get(field)]
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'必須項目が不足しています: {", ".join(missing)}'})
            }

        # attendance を正規化（保存・通知の両方で統一された値に）
        data['attendance'] = normalize_attendance(data.get('attendance'))

        # ★★★ ここからが修正箇所 ★★★
        
        # 1. Googleスプレッドシートに書き込み
        spreadsheet_success, spreadsheet_result = write_to_spreadsheet(data)
        
        # スプレッドシートへの書き込みが失敗したら、そこで処理を中断してエラーを返す
        if not spreadsheet_success:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'データベースへの登録に失敗しました: {spreadsheet_result}'})
            }

        # 2. メールを送信 (スプレッドシート書き込みが成功した場合のみ)
        email_success, email_result = send_email(data)
        
        # メール送信が失敗しても、データ登録は成功しているので、成功レスポンスを返す
        # (ただし、エラーはログに残しておくと良い)
        if not email_success:
            print(f"警告: データは保存されましたが、メール通知に失敗しました: {email_result}")

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': '回答を受け付けました。ありがとうございます。'})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }