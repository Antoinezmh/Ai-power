from .exec import router as exec_router
from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .roles import router as roles_router          # ← 必须存在
from .permissions import router as permissions_router
from .tools import router as tools_router
from .stats import router as stats_router
from .settings import router as settings_router
from .categories import router as categories_router   # 新增
from .favorites import router as favorites_router     # 新增
from .sso import router as sso_router                  # SSO 统一登录
from .files import router as files_router              # 文件中心
from .chat import router as chat_router
router = APIRouter(prefix="/v1")
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(roles_router)               # ← 必须注册
router.include_router(permissions_router)
router.include_router(tools_router)
router.include_router(stats_router)
router.include_router(settings_router)
router.include_router(categories_router)
router.include_router(favorites_router)
router.include_router(sso_router)
router.include_router(files_router)
router.include_router(exec_router)
router.include_router(chat_router)
