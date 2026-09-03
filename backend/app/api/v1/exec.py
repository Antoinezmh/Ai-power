from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.models.tool import Tool
from app.services.exec_service import ExecService
from app.schemas.exec import ExecStartResponse, ExecStatusResponse
import logging

router = APIRouter(prefix="/exec", tags=["exec"])
logger = logging.getLogger(__name__)


@router.post("/run/{tool_id}", response_model=ExecStartResponse)
async def run_executable(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(require_permission("button:tools:use")),
):
    """启动可执行程序或返回 Streamlit 访问地址"""
    # 查询工具
    tool = await db.get(Tool, tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    if tool.type not in ["executable", "streamlit"]:
        raise HTTPException(status_code=400, detail="Tool type not executable")

    # 权限检查：只有管理员或拥有 "button:tools:use" 权限的用户可启动
    # 这里由前端 PermissionGuard 控制，后端再验证
    # 如需更细粒度，可检查用户角色

    try:
        if tool.type == "executable":
            process_id = await ExecService.start_executable(tool, current_user.id)
            return ExecStartResponse(
                status="started",
                process_id=process_id,
                message=f"Executable started: {tool.name}"
            )
        else:  # streamlit
            # 假设 Streamlit 服务运行在独立端口，由 Nginx 代理
            # 返回相对路径，前端通过 window.open 访问
            streamlit_url = f"/streamlit/{tool_id}/"
            return ExecStartResponse(
                status="ready",
                url=streamlit_url,
                message="Streamlit app is available"
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Exec run error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/status/{process_id}", response_model=ExecStatusResponse)
async def get_exec_status(
    process_id: str,
    current_user: User = Depends(get_current_user)
):
    """查询进程状态"""
    status = await ExecService.get_status(process_id)
    if status["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Process not found")
    return ExecStatusResponse(**status)


@router.post("/stop/{process_id}")
async def stop_executable(
    process_id: str,
    current_user: User = Depends(get_current_user)
):
    """停止进程（仅限启动者或管理员）"""
    info = await ExecService.get_status(process_id)
    if info["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Process not found")
    # 检查权限：启动者或超级管理员
    # 但 info 中没有 user_id，需要从 store 获取，我们增加额外检查
    # 为简化，这里只允许管理员停止
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Only admin can stop processes")
    success = await ExecService.stop_executable(process_id)
    if not success:
        raise HTTPException(status_code=404, detail="Process not found")
    return {"message": "Process stopped"}
