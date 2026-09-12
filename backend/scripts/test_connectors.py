"""Test government connectors."""
import asyncio
import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))

from app.services.connectors.base import get_connector


async def test_connectors():
    """Test all mock connectors."""
    
    # Test LRMS connector
    lrms = get_connector("lrms")
    print(f"LRMS connector synthetic: {lrms.is_synthetic}")
    
    record = await lrms.fetch_reference_record("45", "Kharadi")
    print(f"LRMS lookup survey_45: {record}")
    
    geometry = await lrms.fetch_cadastral_geometry("parcel_123")
    print(f"Cadastral geometry: {geometry}")
    
    # Test GIS connector
    gis = get_connector("gis")
    print(f"GIS connector synthetic: {gis.is_synthetic}")
    
    geometry = await gis.fetch_cadastral_geometry("parcel_456")
    print(f"GIS geometry: {geometry}")
    
    print("\nAll connectors working ✓")


if __name__ == "__main__":
    asyncio.run(test_connectors())