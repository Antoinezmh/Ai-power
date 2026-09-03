"""平台文件中心：分组/功能型常量定义。

目录结构：
  <data_root>/<一级分组>/<功能型>/<工具 namespace>/<原文件名>
一级分组固定八组，每组下固定三个功能型。
"""
from typing import List

# 八个一级分组（顺序即目录/展示顺序）
GROUPS: List[str] = [
    "器件组",
    "GaN功率组",
    "系统与表征组",
    "外延组",
    "sic开发组",
    "射频组",
    "工艺工程组",
    "si基研发组",
]

# 每个一级分组下的三个功能型
FUNC_TYPES: List[str] = [
    "数据处理",   # 数据处理的程序/工具
    "报告产出",   # PPT报告制作的程序/工具
    "原始数据",   # 数据库相关的程序/工具
]

# 合法性校验
VALID_GROUPS = set(GROUPS)
VALID_FUNC_TYPES = set(FUNC_TYPES)


def is_valid_group(name: str) -> bool:
    return name in VALID_GROUPS


def is_valid_func_type(name: str) -> bool:
    return name in VALID_FUNC_TYPES
