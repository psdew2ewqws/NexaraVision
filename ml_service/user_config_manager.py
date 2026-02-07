#!/usr/bin/env python3
"""
================================================================================
NexaraVision User Configuration Manager
================================================================================

Multi-tenant model configuration support for the ML service.
Fetches and caches user-specific model configurations from the API.

Features:
- Per-user model selection (PRIMARY and VETO models)
- Per-user threshold configuration
- Configuration caching with TTL
- Automatic fallback to defaults
- Thread-safe for concurrent users

Usage:
    from user_config_manager import UserConfigManager

    config_manager = UserConfigManager(api_url="https://nexaravision.com/api/model-config")

    # Get config for a user
    config = config_manager.get_user_config(user_id)

    # Use in detection
    primary_model = config['primary_model']
    primary_threshold = config['primary_threshold']
    veto_model = config['veto_model']
    veto_threshold = config['veto_threshold']

Author: NexaraVision AI Team
Date: January 22, 2026
================================================================================
"""

import json
import time
import threading
import requests
from typing import Dict, Optional, Any
from dataclasses import dataclass
from pathlib import Path

# Default configuration (production tested)
DEFAULT_CONFIG = {
    'primary_model': 'STGCNPP_Kaggle_NTU',
    'primary_threshold': 94,
    'veto_model': 'MSG3D_Kaggle_NTU',
    'veto_threshold': 85,
    'smart_veto_enabled': True,
    'preset_id': 'production',
}

# Model paths on server
MODEL_PATHS = {
    'STGCNPP_Kaggle_NTU': '/app/nexaravision/models/combined/STGCNPP_Kaggle_NTU.pth',
    'MSG3D_Kaggle_NTU': '/app/nexaravision/models/combined/MSG3D_Kaggle_NTU.pth',
    'MSG3D_RWF_NTU': '/app/nexaravision/models/combined/MSG3D_RWF_NTU.pth',
    'STGCNPP_RWF_NTU': '/app/nexaravision/models/combined/STGCNPP_RWF_NTU.pth',
    'STGCNPP_SCVD_NTU': '/app/nexaravision/models/combined/STGCNPP_SCVD_NTU.pth',
    'MSG3D_SCVD_NTU': '/app/nexaravision/models/combined/MSG3D_SCVD_NTU.pth',
    'MSG3D_RWF_Kaggle': '/app/nexaravision/models/combined/MSG3D_RWF_Kaggle.pth',
    'STGCNPP_RWF_Kaggle': '/app/nexaravision/models/combined/STGCNPP_RWF_Kaggle.pth',
    'MSG3D_SCVD_Kaggle': '/app/nexaravision/models/combined/MSG3D_SCVD_Kaggle.pth',
    'STGCNPP_SCVD_Kaggle': '/app/nexaravision/models/combined/STGCNPP_SCVD_Kaggle.pth',
    'STGCNPP_SCVD_NTU_lightft': '/app/nexaravision/models/light_finetuned/STGCNPP_SCVD_NTU_lightft.pth',
    'STGCNPP_Kaggle_NTU_lightft': '/app/nexaravision/models/light_finetuned/STGCNPP_Kaggle_NTU_lightft.pth',
    'STGCNPP_SCVD_Kaggle_lightft': '/app/nexaravision/models/light_finetuned/STGCNPP_SCVD_Kaggle_lightft.pth',
}

# Model architectures
MODEL_ARCHITECTURES = {
    'STGCNPP_Kaggle_NTU': 'STGCNPP',
    'MSG3D_Kaggle_NTU': 'MSG3D',
    'MSG3D_RWF_NTU': 'MSG3D',
    'STGCNPP_RWF_NTU': 'STGCNPP',
    'STGCNPP_SCVD_NTU': 'STGCNPP',
    'MSG3D_SCVD_NTU': 'MSG3D',
    'MSG3D_RWF_Kaggle': 'MSG3D',
    'STGCNPP_RWF_Kaggle': 'STGCNPP',
    'MSG3D_SCVD_Kaggle': 'MSG3D',
    'STGCNPP_SCVD_Kaggle': 'STGCNPP',
    'STGCNPP_SCVD_NTU_lightft': 'STGCNPP',
    'STGCNPP_Kaggle_NTU_lightft': 'STGCNPP',
    'STGCNPP_SCVD_Kaggle_lightft': 'STGCNPP',
}


@dataclass
class CachedConfig:
    """Cached user configuration with TTL"""
    config: Dict[str, Any]
    timestamp: float
    ttl: float = 30  # 30 seconds - reduced from 5min for faster settings propagation

    def is_expired(self) -> bool:
        return time.time() - self.timestamp > self.ttl


class UserConfigManager:
    """
    Manages user-specific model configurations for multi-tenant detection.

    Supports:
    - Per-user model selection
    - Per-user thresholds
    - Configuration caching
    - Automatic defaults fallback
    - Thread-safe operations
    """

    def __init__(
        self,
        api_url: str = "https://nexaravision.com/api/model-config",
        cache_ttl: float = 30,  # 30 seconds - reduced for faster settings propagation
        fetch_timeout: float = 5.0,
    ):
        """
        Initialize the config manager.

        Args:
            api_url: Base URL for the configuration API
            cache_ttl: Cache time-to-live in seconds
            fetch_timeout: API request timeout in seconds
        """
        self.api_url = api_url.rstrip('/')
        self.cache_ttl = cache_ttl
        self.fetch_timeout = fetch_timeout

        # Thread-safe cache
        self._cache: Dict[str, CachedConfig] = {}
        self._cache_lock = threading.Lock()

        # Stats
        self._hits = 0
        self._misses = 0
        self._errors = 0

    def get_user_config(self, user_id: Optional[str]) -> Dict[str, Any]:
        """
        Get the model configuration for a user.

        Args:
            user_id: User ID (None or empty for anonymous/default)

        Returns:
            Configuration dict with primary_model, primary_threshold,
            veto_model, veto_threshold, etc.
        """
        # Anonymous users get defaults
        if not user_id or user_id in ('undefined', 'null', 'anonymous'):
            return self._get_defaults_with_paths()

        # Check cache first
        cached = self._get_cached(user_id)
        if cached:
            self._hits += 1
            return cached

        # Fetch from API
        self._misses += 1
        config = self._fetch_config(user_id)

        # Cache the result
        self._set_cached(user_id, config)

        return config

    def invalidate_cache(self, user_id: Optional[str] = None):
        """
        Invalidate cached configuration.

        Args:
            user_id: Specific user to invalidate, or None for all
        """
        with self._cache_lock:
            if user_id:
                self._cache.pop(user_id, None)
            else:
                self._cache.clear()

    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        return {
            'cache_hits': self._hits,
            'cache_misses': self._misses,
            'api_errors': self._errors,
            'cached_users': len(self._cache),
        }

    def _get_cached(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached config if valid"""
        with self._cache_lock:
            cached = self._cache.get(user_id)
            if cached and not cached.is_expired():
                return cached.config
            return None

    def _set_cached(self, user_id: str, config: Dict[str, Any]):
        """Cache a config"""
        with self._cache_lock:
            self._cache[user_id] = CachedConfig(
                config=config,
                timestamp=time.time(),
                ttl=self.cache_ttl,
            )

    def _fetch_config(self, user_id: str) -> Dict[str, Any]:
        """Fetch config from API"""
        try:
            url = f"{self.api_url}/{user_id}"
            response = requests.get(url, timeout=self.fetch_timeout)

            if response.status_code == 200:
                data = response.json()
                return self._enrich_config(data)
            else:
                print(f"[ConfigManager] API returned {response.status_code} for user {user_id}")
                self._errors += 1
                return self._get_defaults_with_paths()

        except requests.RequestException as e:
            print(f"[ConfigManager] API error for user {user_id}: {e}")
            self._errors += 1
            return self._get_defaults_with_paths()

        except Exception as e:
            print(f"[ConfigManager] Unexpected error for user {user_id}: {e}")
            self._errors += 1
            return self._get_defaults_with_paths()

    def _enrich_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Add model paths and architectures to config"""
        primary_model = config.get('primary_model', DEFAULT_CONFIG['primary_model'])
        veto_model = config.get('veto_model', DEFAULT_CONFIG['veto_model'])

        return {
            **config,
            'primary_model_path': MODEL_PATHS.get(primary_model, MODEL_PATHS['STGCNPP_Kaggle_NTU']),
            'primary_architecture': MODEL_ARCHITECTURES.get(primary_model, 'STGCNPP'),
            'veto_model_path': MODEL_PATHS.get(veto_model, MODEL_PATHS['MSG3D_Kaggle_NTU']),
            'veto_architecture': MODEL_ARCHITECTURES.get(veto_model, 'MSG3D'),
        }

    def _get_defaults_with_paths(self) -> Dict[str, Any]:
        """Get default config with model paths"""
        return self._enrich_config(DEFAULT_CONFIG.copy())


# Global instance for convenience
_default_manager: Optional[UserConfigManager] = None


def get_config_manager(api_url: Optional[str] = None) -> UserConfigManager:
    """
    Get the global config manager instance.

    Args:
        api_url: Optional API URL override

    Returns:
        UserConfigManager instance
    """
    global _default_manager

    if _default_manager is None:
        url = api_url or "https://nexaravision.com/api/model-config"
        _default_manager = UserConfigManager(api_url=url)

    return _default_manager


def get_user_config(user_id: Optional[str]) -> Dict[str, Any]:
    """
    Convenience function to get user config.

    Args:
        user_id: User ID

    Returns:
        Configuration dict
    """
    return get_config_manager().get_user_config(user_id)


# Example usage
if __name__ == '__main__':
    # Test the config manager
    manager = UserConfigManager(api_url="https://nexaravision.com/api/model-config")

    # Get default config
    default_config = manager.get_user_config(None)
    print("Default config:")
    print(json.dumps(default_config, indent=2))

    # Get stats
    print("\nStats:", manager.get_stats())
