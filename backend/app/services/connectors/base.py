"""Government connector interfaces for LANDLENS backend."""
from abc import ABC, abstractmethod
from typing import Any, Optional
import asyncio


class BaseConnector(ABC):
    """Base interface for all government system connectors."""
    
    @abstractmethod
    async def fetch_reference_record(self, survey_number: str, village: str) -> Optional[dict]:
        """Fetch reference record from external system."""
        pass
    
    @abstractmethod
    async def push_approved_record(self, record: dict) -> bool:
        """Push approved Land Record to external system."""
        pass
    
    @abstractmethod
    async def fetch_cadastral_geometry(self, parcel_id: str) -> Optional[dict]:
        """Fetch GIS/cadastral geometry for a parcel."""
        pass


class MockLRMSConnector(BaseConnector):
    """Mock LRMS connector for prototype (clearly labeled as synthetic)."""
    
    def __init__(self):
        self.is_synthetic = True
        self._mock_data = {
            "survey_45": {
                "surveyNo": "45",
                "village": "Kharadi",
                "tehsil": "Pune",
                "district": "Pune",
                "ownerName": "Rajesh Kumar",
                "khataNo": "234",
                "area": "2.5 acres",
                "source": "synthetic"
            },
            "survey_46": {
                "surveyNo": "46",
                "village": "Kharadi",
                "tehsil": "Pune",
                "district": "Pune",
                "ownerName": "Sita Devi",
                "khataNo": "235",
                "area": "1.8 acres",
                "source": "synthetic"
            }
        }
    
    async def fetch_reference_record(self, survey_number: str, village: str) -> Optional[dict]:
        """Return mock data with synthetic label."""
        key = f"survey_{survey_number}"
        return self._mock_data.get(key)
    
    async def push_approved_record(self, record: dict) -> bool:
        """Mock push - in prototype, no actual sync."""
        await asyncio.sleep(0.1)
        return True
    
    async def fetch_cadastral_geometry(self, parcel_id: str) -> Optional[dict]:
        """Return mock geometry."""
        return {
            "type": "Polygon",
            "coordinates": [[[75.78, 18.52], [75.79, 18.52], [75.79, 18.53], [75.78, 18.53]]]
        }


class MockGISConnector(BaseConnector):
    """Mock GIS connector for cadastral data."""
    
    def __init__(self):
        self.is_synthetic = True
    
    async def fetch_reference_record(self, survey_number: str, village: str) -> Optional[dict]:
        """Mock GIS lookup."""
        return None  # No reference data in this mock
    
    async def push_approved_record(self, record: dict) -> bool:
        """Mock push."""
        await asyncio.sleep(0.1)
        return True
    
    async def fetch_cadastral_geometry(self, parcel_id: str) -> Optional[dict]:
        """Return mock polygon."""
        return {
            "type": "Polygon",
            "coordinates": [[[75.8, 18.5], [75.81, 18.5], [75.81, 18.51], [75.8, 18.51]]]
        }


# Registry of available connectors
CONNECTORS = {
    "lrms": MockLRMSConnector,
    "gis": MockGISConnector,
    "dilrmp": MockLRMSConnector,  # Reuse LRMS for demo
}


def get_connector(name: str) -> BaseConnector:
    """Get a connector instance by name."""
    if name not in CONNECTORS:
        raise ValueError(f"Unknown connector: {name}")
    return CONNECTORS[name]()