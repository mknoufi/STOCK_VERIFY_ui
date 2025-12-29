import asyncio
import os
from dotenv import load_dotenv
from agent_framework import ChatAgent
from agent_framework.openai import OpenAIChatClient
from agent_framework.observability import setup_observability
from openai import AsyncOpenAI

# Load environment variables
load_dotenv()

# Set up for OpenTelemetry tracing
setup_observability(
    otlp_endpoint="http://localhost:4317",  # AI Toolkit gRPC endpoint
    enable_sensitive_data=True  # Enable capturing prompts and completions
)

async def main():
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token or github_token == "your_github_token_here":
        print("Error: GITHUB_TOKEN not found in .env file.")
        print("Please get a token from https://github.com/settings/tokens and add it to cooking_agent/.env")
        return

    print("Initializing Cooking AI Agent...")

    # Initialize OpenAI Client for GitHub Models
    openai_client = AsyncOpenAI(
        base_url="https://models.github.ai/inference",
        api_key=github_token,
    )

    # Initialize Chat Client
    # Using gpt-4o-mini as a capable model for recipes
    chat_client = OpenAIChatClient(
        async_client=openai_client,
        model_id="gpt-4o",
    )

    # Define the Agent
    agent = ChatAgent(
        chat_client=chat_client,
        name="ChefBot",
        instructions="""You are ChefBot, an expert culinary AI assistant.
        Your goal is to help users find recipes, suggest cooking tips, and extract ingredients from recipe descriptions.

        Capabilities:
        1. Recipe Search: Suggest detailed recipes based on user requests (e.g., "Italian pasta", "Vegan breakfast").
        2. Ingredient Extraction: When given a recipe text, list the ingredients in a structured format.
        3. Cooking Tips: Provide advice on techniques and substitutions.

        Tone: Friendly, encouraging, and professional.
        Format: Use Markdown for clear formatting of recipes and lists.
        """,
    )

    # Create a thread for conversation persistence
    thread = agent.get_new_thread()

    print("\n👨‍🍳 ChefBot is ready! (Type 'exit' or 'quit' to stop)")
    print("Try asking: 'Give me a recipe for carbonara' or 'Extract ingredients from this text...'")
    print("-" * 50)

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if user_input.lower() in ["exit", "quit"]:
                print("ChefBot: Happy cooking! Goodbye! 👋")
                break

            if not user_input:
                continue

            print("ChefBot: ", end="", flush=True)

            # Run the agent stream
            async for chunk in agent.run_stream(user_input, thread=thread):
                if chunk.text:
                    print(chunk.text, end="", flush=True)
            print("\n")

        except KeyboardInterrupt:
            print("\nChefBot: Goodbye! 👋")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())
