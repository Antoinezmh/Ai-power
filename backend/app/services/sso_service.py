from urllib.parse import urlencode
from app.core.config import settings


def is_sso_enabled():
    # The provider exchange/mapping adapter is intentionally not advertised
    # until it is implemented and verified against the real IDaaS tenant.
    return False


def build_authorize_url():
    return f"{settings.SSO_BASE_URL}{settings.SSO_AUTHORIZE_PATH}?{urlencode({'client_id': settings.SSO_CLIENT_ID, 'redirect_uri': settings.SSO_REDIRECT_URI, 'response_type': 'code', 'scope': settings.SSO_SCOPE})}"
async def sso_login(db, code): raise ValueError('SSO integration is not configured')
