from typing import Dict, Optional, List
import re
from collections import Counter


class LanguageDetector:
    """Service for detecting language of text input."""
    
    def __init__(self):
        # Language indicators for French, Hausa, and Zarma
        self.language_patterns = {
            'fr': {
                'common_words': [
                    'le', 'la', 'les', 'de', 'du', 'des', 'et', 'est', 'dans', 'pour',
                    'que', 'qui', 'avec', 'par', 'sur', 'il', 'elle', 'nous', 'vous',
                    'ils', 'elles', 'être', 'avoir', 'faire', 'dire', 'aller', 'voir',
                    'savoir', 'pouvoir', 'vouloir', 'venir', 'falloir', 'devoir',
                    'un', 'une', 'ce', 'se', 'ne', 'me', 'te', 'lui', 'leur', 'y',
                    'en', 'on', 'ça', 'tout', 'plus', 'très', 'bien', 'comme', 'mais',
                    'où', 'quand', 'comment', 'pourquoi', 'quel', 'quelle', 'quels',
                    'bonjour', 'merci', 'au', 'aux', 'mon', 'ma', 'mes', 'ton', 'ta'
                ],
                'accents': ['é', 'è', 'ê', 'ë', 'à', 'â', 'ä', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'ç', 'œ'],
                'patterns': [r'\b(l[ae]|d[au]|qu[ei])\b', r'\b(est|sont|été|étais|était|sera|seront)\b']
            },
            'ha': {
                'common_words': [
                    'na', 'ne', 'in', 'da', 'ga', 'ta', 'ya', 'za', 'ma', 'ka', 'ra',
                    'wannan', 'wannaga', 'wace', 'wadannan', 'saboda', 'amma', 'ko',
                    'don', 'sai', 'tana', 'yana', 'sun', 'mun', 'kun', 'sunan', 'sunayen',
                    'abu', 'abubuwa', 'gida', 'gidaje', 'mutum', 'mutane', 'ruwa', 'sani',
                    'lafiya', 'godiya', ' barka', 'sannu', 'yi', 'yiwa', 'cika', 'ba', 'bawa',
                    'bayan', 'cikin', 'farko', 'karshe', 'kullum', 'yau', 'gobe', 'jiya',
                    'wuri', 'lokaci', 'hanya', 'sako', 'labari', 'aiki', 'makaranta'
                ],
                'special_chars': ['ɓ', 'ɗ', 'ƙ', 'ʼ', 'sh', 'ch', 'ts'],
                'patterns': [r'\b(na|ne|in|da|ga)\b', r'\b(wannan|wace|wadannan)\b']
            },
            'zm': {
                'common_words': [
                    'i', 'a', 'ga', 'na', 'no', 'ma', 'ka', 'ra', 'ya', 'ze', 'we', 'me',
                    'te', 'se', 'ne', 'nde', 'nka', 'nga', 'ngo', 'ŋ', 'ɲ', 'ɛ', 'ɔ',
                    'hãa', 'hoy', 'bari', 'goy', 'te', 'no', 'wo', 'fu', 'koy', 'beri',
                    'bani', 'ban', 'kã', 'ã', 'õ', 'ĩ', 'ũ', 'ẽ', 'cẽ', 'fõ', 'hõ',
                    'jõ', 'kõ', 'lõ', 'mõ', 'nõ', 'põ', 'rõ', 'sõ', 'tõ', 'wõ', 'yõ',
                    'zõ', 'ari', 'ize', 'izey', 'gubey', 'hanti', 'bã', 'mba', 'nda'
                ],
                'special_chars': ['ŋ', 'ɲ', 'ɛ', 'ɔ', 'ã', 'õ', 'ĩ', 'ũ', 'ẽ', 'cẽ', 'fõ'],
                'patterns': [r'\b(i|a|ga|na|no)\b', r'\b(hãa|hoy|bari|goy)\b']
            }
        }
    
    def detect_language(self, text: str) -> Dict[str, any]:
        """Detect the language of the given text."""
        
        if not text or not text.strip():
            return {
                'detected_language': 'unknown',
                'confidence': 0.0,
                'scores': {}
            }
        
        # Clean and normalize text
        clean_text = self._clean_text(text)
        words = self._tokenize(clean_text)
        
        if len(words) < 3:
            return {
                'detected_language': 'unknown',
                'confidence': 0.0,
                'scores': {},
                'reason': 'Text too short for reliable detection'
            }
        
        # Calculate scores for each language
        scores = {}
        
        for lang_code, lang_data in self.language_patterns.items():
            score = self._calculate_language_score(words, clean_text, lang_data)
            scores[lang_code] = score
        
        # Determine the most likely language
        if not scores:
            return {
                'detected_language': 'unknown',
                'confidence': 0.0,
                'scores': {}
            }
        
        # Get the language with highest score
        best_lang = max(scores, key=scores.get)
        confidence = scores[best_lang]
        
        # Apply confidence threshold
        if confidence < 0.1:
            best_lang = 'unknown'
            confidence = 0.0
        
        return {
            'detected_language': best_lang,
            'confidence': round(confidence, 3),
            'scores': {k: round(v, 3) for k, v in scores.items()},
            'word_count': len(words),
            'text_length': len(clean_text)
        }
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for analysis."""
        # Convert to lowercase
        text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove punctuation but keep language-specific characters
        text = re.sub(r'[^\w\sŋɲɛɔãõĩũẽcẽfõ\'\-\']', ' ', text)
        
        return text.strip()
    
    def _tokenize(self, text: str) -> List[str]:
        """Split text into words."""
        return text.split()
    
    def _calculate_language_score(self, words: List[str], text: str, lang_data: Dict) -> float:
        """Calculate language score based on various indicators."""
        
        score = 0.0
        
        # 1. Common words matching (40% weight)
        common_words_score = self._calculate_common_words_score(words, lang_data['common_words'])
        score += common_words_score * 0.4
        
        # 2. Special characters presence (20% weight)
        special_chars_score = self._calculate_special_chars_score(text, lang_data.get('special_chars', []))
        score += special_chars_score * 0.2
        
        # 3. Pattern matching (30% weight)
        patterns_score = self._calculate_patterns_score(text, lang_data.get('patterns', []))
        score += patterns_score * 0.3
        
        # 4. Word length and structure (10% weight)
        structure_score = self._calculate_structure_score(words, lang_data['common_words'])
        score += structure_score * 0.1
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _calculate_common_words_score(self, words: List[str], common_words: List[str]) -> float:
        """Calculate score based on common words matching."""
        if not words:
            return 0.0
        
        word_set = set(words)
        common_word_set = set(common_words)
        
        matches = len(word_set.intersection(common_word_set))
        total_words = len(word_set)
        
        if total_words == 0:
            return 0.0
        
        return matches / total_words
    
    def _calculate_special_chars_score(self, text: str, special_chars: List[str]) -> float:
        """Calculate score based on special characters presence."""
        if not special_chars:
            return 0.0
        
        char_count = 0
        for char in special_chars:
            char_count += text.count(char)
        
        # Normalize by text length
        if len(text) == 0:
            return 0.0
        
        return min(char_count / len(text) * 10, 1.0)  # Scale and cap at 1.0
    
    def _calculate_patterns_score(self, text: str, patterns: List[str]) -> float:
        """Calculate score based on regex pattern matching."""
        if not patterns:
            return 0.0
        
        pattern_matches = 0
        for pattern in patterns:
            matches = len(re.findall(pattern, text))
            pattern_matches += matches
        
        # Normalize by text length
        if len(text) == 0:
            return 0.0
        
        return min(pattern_matches / len(text) * 5, 1.0)  # Scale and cap at 1.0
    
    def _calculate_structure_score(self, words: List[str], common_words: List[str]) -> float:
        """Calculate score based on word structure characteristics."""
        if not words:
            return 0.0
        
        # Average word length
        avg_length = sum(len(word) for word in words) / len(words)
        
        # Word length distribution
        short_words = sum(1 for word in words if len(word) <= 3)
        medium_words = sum(1 for word in words if 4 <= len(word) <= 6)
        long_words = sum(1 for word in words if len(word) > 6)
        
        # Different languages have different word length distributions
        # This is a simplified heuristic
        if avg_length < 4 and short_words / len(words) > 0.4:
            return 0.3  # Likely Hausa or Zarma (shorter words)
        elif avg_length > 5 and long_words / len(words) > 0.2:
            return 0.3  # Likely French (longer words)
        else:
            return 0.2  # Neutral
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages with their names."""
        return {
            'fr': 'Français',
            'ha': 'Hausa',
            'zm': 'Zarma',
            'unknown': 'Inconnu'
        }
    
    def is_supported(self, language_code: str) -> bool:
        """Check if a language is supported."""
        return language_code in self.language_patterns or language_code == 'unknown'
