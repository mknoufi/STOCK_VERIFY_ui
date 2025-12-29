import asyncio
import os
from dotenv import load_dotenv
from agent_framework import ChatAgent
from agent_framework.openai import OpenAIChatClient
from openai import AsyncOpenAI

# Load environment variables
load_dotenv()

async def main():
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token or github_token == "your_github_token_here":
        print("Error: GITHUB_TOKEN not found in .env file.")
        return

    print("Initializing Cooking AI Agent for Test...")

    openai_client = AsyncOpenAI(
        base_url="https://models.github.ai/inference",
        api_key=github_token,
    )

    chat_client = OpenAIChatClient(
        async_client=openai_client,
        model_id="gpt-4o",
    )

    agent = ChatAgent(
        chat_client=chat_client,
        name="ChefBot",
        instructions="You are a helpful chef.",
    )

    print("Sending test query: 'Suggest a quick snack.'")
    print("ChefBot: ", end="", flush=True)

    async for chunk in agent.run_stream("Suggest a quick snack.", thread=agent.get_new_thread()):
        if chunk.text:
            print(chunk.text, end="", flush=True)
    print("\n\nTest completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
