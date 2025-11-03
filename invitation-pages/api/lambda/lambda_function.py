import json
import os
import boto3
from botocore.exceptions import ClientError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def create_email_body(data):
    """メール本文を生成する"""
    attendance = "ご出席" if data.get('attendance') == 'attend' else "ご欠席"
    
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

    # メールの作成
    msg = MIMEMultipart()
    msg['Subject'] = f"結婚式出欠回答: {data.get('name')}様 ({attendance})"
    msg['From'] = sender
    msg['To'] = recipient

    # 本文の作成
    body_text = create_email_body(data)
    msg.attach(MIMEText(body_text, 'plain', 'utf-8'))

    try:
        # SESクライアントの作成
        client = boto3.client('ses', region_name=aws_region)
        
        # メール送信
        response = client.send_raw_email(
            Source=sender,
            Destinations=[recipient],
            RawMessage={'Data': msg.as_string()}
        )
        return True, response['MessageId']
    except ClientError as e:
        return False, str(e.response['Error'])

def lambda_handler(event, context):
    """Lambda関数のメインハンドラー"""
    try:
        # APIGatewayからのイベントの場合、bodyを解析
        if event.get('body'):
            data = json.loads(event['body'])
        else:
            data = event

        # バリデーション
        required_fields = ['name', 'kana', 'email', 'attendance']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': f'必須項目が不足しています: {", ".join(missing_fields)}'
                })
            }

        # メール送信
        success, result = send_email(data)
        
        if success:
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'message': '回答を受け付けました。ありがとうございます。',
                    'messageId': result
                })
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'error': f'メール送信に失敗しました: {result}'
                })
            }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': str(e)
            })
        }