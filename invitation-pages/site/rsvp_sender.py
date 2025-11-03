"""
フロントエンド側のRSVPフォーム送信処理
"""
import json
import requests

def send_rsvp(form_data):
    """
    RSVPフォームのデータをLambda関数に送信する
    
    Parameters:
    -----------
    form_data : dict
        フォームから送信されたデータ
        {
            'name': str,
            'kana': str,
            'email': str,
            'attendance': str ('attend' or 'absent'),
            'allergy': str,
            'message': str
        }
    
    Returns:
    --------
    tuple
        (success: bool, message: str)
    """
    # Lambda関数のエンドポイントURL
    LAMBDA_URL = "https://xxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/rsvp"
    
    try:
        # POSTリクエストを送信
        response = requests.post(
            LAMBDA_URL,
            json=form_data,
            headers={'Content-Type': 'application/json'}
        )
        
        # レスポンスの解析
        data = response.json()
        
        if response.status_code == 200:
            return True, data.get('message', '回答を受け付けました。')
        else:
            return False, data.get('error', '送信に失敗しました。')
            
    except requests.RequestException as e:
        return False, f"ネットワークエラー: {str(e)}"
    except json.JSONDecodeError:
        return False, "レスポンスの解析に失敗しました。"
    except Exception as e:
        return False, f"予期せぬエラー: {str(e)}"

def handle_form_submission():
    """
    フォーム送信時のハンドラー関数の例
    """
    # フォームデータの例
    form_data = {
        'name': '山田 太郎',
        'kana': 'やまだ たろう',
        'email': 'yamada@example.com',
        'attendance': 'attend',
        'allergy': '卵アレルギー',
        'message': 'お招きありがとうございます。'
    }
    
    # 送信処理
    success, message = send_rsvp(form_data)
    
    if success:
        print("送信成功:", message)
    else:
        print("送信失敗:", message)

if __name__ == "__main__":
    # テスト用の実行
    handle_form_submission()