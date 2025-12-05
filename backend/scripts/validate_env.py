import os

from dotenv import load_dotenv


def validate_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    print(f"Checking .env at: {env_path}")

    if not os.path.exists(env_path):
        print("ERROR: .env file not found!")
        return

    load_dotenv(env_path)

    required_keys = [
        "MONGO_URL",
        "DB_NAME",
        "SQL_SERVER_HOST",
        "SQL_SERVER_PORT",
        "SQL_SERVER_USER",
        "SQL_SERVER_PASSWORD",
        "JWT_SECRET",
        "JWT_REFRESH_SECRET",
    ]

    missing = []
    for key in required_keys:
        value = os.getenv(key)
        if not value:
            missing.append(key)
        else:
            print(f"✅ {key} is set")

    if missing:
        print(f"❌ Missing keys: {', '.join(missing)}")
    else:
        print("✅ All required environment variables are present.")


if __name__ == "__main__":
    validate_env()
