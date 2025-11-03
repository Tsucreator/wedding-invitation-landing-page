# RSVP Lambda Function (Python)

結婚式の出欠フォームからのレスポンスを処理するPython Lambda関数です。

## 機能
- AWS SESを使用した管理者へのメール通知
- フォームデータのバリデーション
- CORSヘッダー対応のAPIレスポンス

## 必要な環境変数
- `SENDER_EMAIL`: 送信元メールアドレス（SESで検証済みのアドレス）
- `RECIPIENT_EMAIL`: 通知先メールアドレス
- `AWS_REGION`: AWSリージョン（デフォルト: ap-northeast-1）

## デプロイ手順

1. 環境準備
```bash
# 仮想環境の作成
python -m venv lambda-env
source lambda-env/bin/activate  # Windows: .\lambda-env\Scripts\activate

# 依存パッケージのインストール
pip install -r requirements.txt
```

2. デプロイパッケージの作成
```bash
zip -r function.zip lambda_function.py
cd lambda-env/lib/python3.x/site-packages
zip -r ../../../../function.zip *
```

3. AWS設定
- Lambda関数の作成（Python 3.9以上）
- 環境変数の設定
- IAMロールに必要な権限を付与（SES:SendEmail）
- API Gatewayとの連携設定

## リクエスト例
```json
{
  "name": "山田 太郎",
  "kana": "やまだ たろう",
  "attendance": "attend",
  "email": "guest@example.com",
  "allergy": "卵",
  "message": "よろしくお願いします"
}
```

## 注意事項
- SESの送信元メールアドレスは事前に検証が必要
- SESがサンドボックスモードの場合、受信者アドレスも検証が必要
- 本番環境ではCORS設定を適切に制限
- APIキーなどの認証を検討

## デバッグとトラブルシューティング
- CloudWatchログで詳細なエラー情報を確認可能
- テスト時はAPI Gatewayのテストリクエストを活用
- タイムアウトは30秒を推奨
