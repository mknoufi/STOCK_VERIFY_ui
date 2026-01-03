"""
security.txt Endpoint

Implements RFC 9116 security.txt for responsible vulnerability disclosure.
https://www.rfc-editor.org/rfc/rfc9116
"""

from datetime import datetime, timedelta

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

security_txt_router = APIRouter(tags=["security"])

# Calculate expiry date (1 year from now)
EXPIRES_DATE = (datetime.utcnow() + timedelta(days=365)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

SECURITY_TXT_CONTENT = f"""# Stock Verification System Security Policy
# See https://securitytxt.org/ for format specification

Contact: mailto:security@stockverify.local
Expires: {EXPIRES_DATE}
Preferred-Languages: en
Canonical: /.well-known/security.txt

# Policy
# We take security seriously. If you discover a vulnerability,
# please report it responsibly via the contact email above.
# We commit to acknowledging receipt within 48 hours and
# providing a detailed response within 7 days.
"""


@security_txt_router.get(
    "/.well-known/security.txt",
    response_class=PlainTextResponse,
    summary="Security.txt",
    description="RFC 9116 security.txt file for responsible disclosure",
)
async def get_security_txt():
    """Return security.txt content per RFC 9116"""
    return PlainTextResponse(
        content=SECURITY_TXT_CONTENT,
        media_type="text/plain",
    )


@security_txt_router.get(
    "/security.txt",
    response_class=PlainTextResponse,
    summary="Security.txt (fallback)",
    description="Fallback security.txt location",
)
async def get_security_txt_fallback():
    """Fallback security.txt at root level"""
    return PlainTextResponse(
        content=SECURITY_TXT_CONTENT,
        media_type="text/plain",
    )
