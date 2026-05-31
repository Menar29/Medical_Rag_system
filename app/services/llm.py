from typing import Optional, List, Dict, Any
import os
import requests
import json


class OllamaLLM:
    """Service for connecting to local Ollama Gemma 4 model."""
    
    def __init__(self, model: str = "gemma4", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
    
    def generate_response(
        self, 
        prompt: str, 
        context: Optional[List[str]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ) -> str:
        """Generate a response using local Gemma 4 via Ollama."""
        
        # Build context-aware prompt
        if context:
            context_str = "\n".join([f"- {doc}" for doc in context])
            full_prompt = f"""Contexte:
{context_str}

Question: {prompt}

Réponse:"""
        else:
            full_prompt = prompt
        
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                }
            )
            
            if response.status_code == 200:
                return response.json().get("response", "").strip()
            else:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
            
        except Exception as e:
            raise Exception(f"Error generating response: {str(e)}")
    
    def generate_streaming_response(
        self,
        prompt: str,
        context: Optional[List[str]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000
    ):
        """Generate a streaming response using local Gemma 4 via Ollama."""
        
        if context:
            context_str = "\n".join([f"- {doc}" for doc in context])
            full_prompt = f"""Contexte:
{context_str}

Question: {prompt}

Réponse:"""
        else:
            full_prompt = prompt
        
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": True,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens
                    }
                },
                stream=True
            )
            
            if response.status_code == 200:
                for line in response.iter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                        except json.JSONDecodeError:
                            continue
            else:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                    
        except Exception as e:
            raise Exception(f"Error generating streaming response: {str(e)}")
