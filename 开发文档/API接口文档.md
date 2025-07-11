# 英语学习助手 API 接口文档

## 📋 概述

英语学习助手是一个基于Flask的Web应用程序，提供视频处理、字幕生成、单词管理、故事创作、翻译、AI智能单词查询和基础词库管理等功能的RESTful API接口。

### ✨ 核心功能
- 🎬 **视频管理**: 视频上传、处理、字幕生成和流式播放
- 📚 **智能单词管理**: 基于DeepSeek AI的智能单词信息获取
- 🏠 **基础词库系统**: 本地14,713个高质量词汇，优先本地查询
- 📖 **故事生成**: AI驱动的英语故事创作
- 🏷️ **分类管理**: 单词分类和批量操作
- 🌐 **翻译服务**: 多语言翻译支持

### 基础信息
- **基础URL**: `http://localhost:5000`
- **API版本**: v2.1.0
- **内容类型**: `application/json`
- **跨域支持**: 已启用CORS
- **AI服务**: DeepSeek API
- **词库规模**: 14,713个高质量英语词汇

### 通用响应格式
```json
{
  "success": true/false,
  "message": "描述信息",
  "data": {}, // 响应数据
  "error": "错误信息" // 仅在失败时返回
}
```

### HTTP状态码
- `200`: 请求成功
- `201`: 创建成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `409`: 资源冲突（如重复数据）
- `500`: 服务器内部错误

---

## 🎬 视频管理模块 (`/api/videos`)

### 1. **POST** `/api/videos/upload`
**功能**: 上传视频文件并开始处理

#### 请求参数
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `file`: 视频文件（必填，支持格式：mp4, avi, mov, mkv）

#### 响应格式
```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "video_id": "uuid-string",
  "videoId": "uuid-string",
  "taskId": "task-uuid",
  "videoUrl": "/api/videos/{video_id}/stream"
}
```

---

### 2. **POST** `/api/videos/check-hash`
**功能**: 检查视频文件是否已存在（重复检测）

#### 请求参数
- **Content-Type**: `multipart/form-data`
- **Body**: 
  - `file`: 视频文件（必填）

#### 响应格式
```json
{
  "success": true,
  "exists": true/false,
  
  // 如果exists为true（找到重复视频）
  "video_id": "uuid-string",
  "filename": "original_filename.mp4",
  "subtitles_count": 12,
  "created_at": "2024-01-15T10:30:00.000000",
  
  // 如果exists为false（新视频）
  "file_hash": "sha256-hash-string",
  "file_size": 1024000
}
```

---

### 3. **GET** `/api/videos/status/{task_id}`
**功能**: 查询视频处理任务状态

#### 请求参数
- **Path Parameters**:
  - `task_id`: 任务ID（必填）

#### 响应格式
```json
{
  "taskId": "task-uuid",
  "videoId": "video-uuid",
  "progress": 75,
  "status": "processing", // pending/processing/completed/failed
  "message": "正在生成字幕..."
}
```

---

### 4. **GET** `/api/videos`
**功能**: 获取视频列表（支持分页）

#### 请求参数
- **Query Parameters**:
  - `page`: 页码（可选，默认1）
  - `per_page`: 每页数量（可选，默认10，最大50）

#### 响应格式
```json
{
  "success": true,
  "videos": [
    {
      "id": "uuid-string",
      "filename": "video.mp4",
      "duration": 120.5,
      "created_at": "2024-01-15T10:30:00.000000",
      "subtitles_count": 12,
      "status": "completed",
      "progress": 100
    }
  ],
  "total": 25,
  "page": 1,
  "per_page": 10,
  "pages": 3
}
```

---

### 5. **GET** `/api/videos/{video_id}`
**功能**: 获取视频详细信息

#### 请求参数
- **Path Parameters**:
  - `video_id`: 视频ID（必填）

#### 响应格式
```json
{
  "success": true,
  "video": {
    "id": "uuid-string",
    "filename": "video.mp4",
    "file_path": "/path/to/video.mp4",
    "duration": 120.5,
    "file_size": 1024000,
    "created_at": "2024-01-15T10:30:00.000000",
    "subtitles_count": 12,
    "file_exists": true
  },
  "tasks": [
    {
      "id": "task-uuid",
      "status": "completed",
      "progress": 100,
      "message": "处理完成",
      "created_at": "2024-01-15T10:30:00.000000"
    }
  ]
}
```

---

### 6. **DELETE** `/api/videos/{video_id}`
**功能**: 删除视频及相关文件

#### 请求参数
- **Path Parameters**:
  - `video_id`: 视频ID（必填）

#### 响应格式
```json
{
  "success": true,
  "message": "Video deleted",
  "deleted_files": ["video", "audio"],
  "failed_files": []
}
```

---

### 7. **GET** `/api/videos/{video_id}/stream`
**功能**: 流式播放视频文件

#### 请求参数
- **Path Parameters**:
  - `video_id`: 视频ID（必填）

#### 响应
返回视频文件流，可直接用于HTML5 video标签播放

---

### 8. **GET** `/api/videos/{video_id}/subtitles`
**功能**: 获取视频字幕

#### 请求参数
- **Path Parameters**:
  - `video_id`: 视频ID（必填）

#### 响应格式
```json
[
  {
    "id": 1,
    "startTime": 0.0,
    "endTime": 3.5,
    "chineseText": "你好，欢迎来到英语学习课程。",
    "englishText": "Hello, welcome to the English learning course."
  },
  {
    "id": 2,
    "startTime": 3.5,
    "endTime": 7.2,
    "chineseText": "今天我们将学习一些基础词汇。",
    "englishText": "Today we will learn some basic vocabulary."
  }
]
```

---

## 📚 单词管理模块 (`/api/words`)

### 1. **GET** `/api/words`
**功能**: 获取单词列表

#### 请求参数
- **Query Parameters**:
  - `category_id`: 分类ID（可选，'all'表示所有分类）

#### 响应格式
```json
[
  {
    "id": 1,
    "text": "hello",
    "translation": "你好",
    "category_id": 1,
    "created_at": "2024-01-15T10:30:00.000000"
  },
  {
    "id": 2,
    "text": "world",
    "translation": "世界",
    "category_id": 1,
    "created_at": "2024-01-15T10:31:00.000000"
  }
]
```

---

### 2. **POST** `/api/words`
**功能**: 添加新单词

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "text": "hello",
  "translation": "你好",
  "category_id": 1  // 可选
}
```

#### 响应格式
```json
{
  "id": 1,
  "text": "hello",
  "translation": "你好",
  "category_id": 1,
  "created_at": "2024-01-15T10:30:00.000000"
}
```

#### 错误响应（409 - 单词已存在）
```json
{
  "error": "Word already exists",
  "word": {
    "id": 1,
    "text": "hello",
    "translation": "你好",
    "category_id": 1,
    "created_at": "2024-01-15T10:30:00.000000"
  }
}
```

---

### 3. **GET** `/api/words/{word_id}`
**功能**: 获取单个单词详情

#### 请求参数
- **Path Parameters**:
  - `word_id`: 单词ID（必填）

#### 响应格式
```json
{
  "id": 1,
  "text": "hello",
  "translation": "你好",
  "category_id": 1,
  "created_at": "2024-01-15T10:30:00.000000"
}
```

---

### 4. **PUT** `/api/words/{word_id}`
**功能**: 更新单词

#### 请求参数
- **Path Parameters**:
  - `word_id`: 单词ID（必填）
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "text": "hello",        // 可选
  "translation": "你好",  // 可选
  "category_id": 1       // 可选
}
```

#### 响应格式
```json
{
  "id": 1,
  "text": "hello",
  "translation": "你好",
  "category_id": 1,
  "created_at": "2024-01-15T10:30:00.000000"
}
```

---

### 5. **DELETE** `/api/words/{word_id}`
**功能**: 删除单词

#### 请求参数
- **Path Parameters**:
  - `word_id`: 单词ID（必填）

#### 响应格式
```json
{
  "message": "Word deleted successfully"
}
```

---

### 6. **DELETE** `/api/words/batch`
**功能**: 批量删除单词

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "word_ids": [1, 2, 3, 4]
}
```

#### 响应格式
```json
{
  "message": "Deleted 4 words"
}
```

---

### 7. **POST** `/api/words/batch/move`
**功能**: 批量移动单词到指定分类

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "word_ids": [1, 2, 3],
  "category_id": 2  // null表示移除分类
}
```

#### 响应格式
```json
{
  "message": "Moved 3 words to category 2"
}
```

---

## 🤖 AI智能单词功能 (`/api/words`)

### 扩展字段说明

#### Word对象新增字段
所有单词对象现在包含以下扩展字段：
```json
{
  "phonetic": "/ˈbjuːtɪfəl/",           // 国际音标(IPA)
  "part_of_speech": "adjective",         // 词性
  "definition": "English definition",     // 英文释义
  "example_sentence": "Example text",    // 英文例句
  "difficulty_level": "intermediate",    // 难度等级
  "frequency_rank": 1250,               // 词频排名
  "auto_generated": true,               // 是否AI生成
  "last_updated": "2024-01-15T11:45:00.000000"  // 最后更新时间
}
```

#### 字段值说明
- **phonetic**: 国际音标格式，如 `/ˈbjuːtɪfəl/`
- **part_of_speech**: 词性类型
  - `noun` - 名词
  - `verb` - 动词  
  - `adjective` - 形容词
  - `adverb` - 副词
  - `interjection` - 感叹词
  - 等等
- **difficulty_level**: 难度等级
  - `elementary` - 初级
  - `intermediate` - 中级
  - `advanced` - 高级
- **frequency_rank**: 词频排名（1-10000，数字越小越常用）
- **auto_generated**: 布尔值，标识是否通过AI自动生成

### 8. **GET** `/api/words/info/{word}`
**功能**: 获取单词详细信息（无需添加到单词本）

#### 使用场景
用户点击选中单词时，快速获取该单词的详细信息

#### 请求参数
- **Path Parameters**:
  - `word`: 要查询的英文单词（必填，仅支持英文字母、连字符、撇号）

#### 响应格式
```json
{
  "success": true,
  "word_info": {
    "word": "beautiful",
    "phonetic": "/ˈbjuːtɪfəl/",
    "part_of_speech": "adjective",
    "chinese_translation": "美丽的",
    "english_definition": "pleasing the senses or mind aesthetically",
    "example_sentence": "She has a beautiful voice.",
    "chinese_example": "她有一个美丽的声音。",
    "difficulty_level": "intermediate",
    "frequency_rank": 1250
  },
  "source": "base_library"  // 数据来源: base_library/deepseek_api/fallback
}
```

---

### 9. **POST** `/api/words/add-with-info` ⭐
**功能**: 智能添加单词（自动获取详细信息）

#### 使用场景
用户选中单词并决定添加到单词本时，自动获取完整信息并保存

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "text": "beautiful",
  "category_id": 2  // 可选，指定分类
}
```

#### 响应格式
```json
{
  "success": true,
  "message": "Word added successfully with detailed information",
  "word": {
    "id": 15,
    "text": "beautiful",
    "translation": "美丽的",
    "phonetic": "/ˈbjuːtɪfəl/",
    "part_of_speech": "adjective",
    "definition": "pleasing the senses or mind aesthetically",
    "example_sentence": "She has a beautiful voice.",
    "difficulty_level": "intermediate",
    "frequency_rank": 1250,
    "category_id": 2,
    "auto_generated": true,
    "created_at": "2024-01-15T10:30:00.000000",
    "last_updated": "2024-01-15T10:30:00.000000"
  },
  "source": "base_library"
}
```

#### 错误响应（单词已存在）
```json
{
  "success": false,
  "error": "Word already exists",
  "word": {
    "id": 10,
    "text": "beautiful",
    "translation": "美丽的",
    "phonetic": "/ˈbjuːtɪfəl/",
    "part_of_speech": "adjective",
    "category_id": 2,
    "created_at": "2024-01-15T10:25:00.000000"
  }
}
```

---

### 10. **POST** `/api/words/batch-info`
**功能**: 批量获取多个单词的详细信息

#### 使用场景
用户选中多个单词时，批量获取信息以提高效率

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "words": ["hello", "beautiful", "important", "interesting"]
}
```

#### 限制
- 每次最多支持20个单词
- 单词列表不能为空

#### 响应格式
```json
{
  "success": true,
  "word_infos": {
    "hello": {
      "word": "hello",
      "phonetic": "/həˈloʊ/",
      "part_of_speech": "interjection",
      "chinese_translation": "你好",
      "english_definition": "Used as a greeting or to attract attention",
      "example_sentence": "Hello, how are you?",
      "chinese_example": "你好，你好吗？",
      "difficulty_level": "elementary",
      "frequency_rank": 150
    },
    "beautiful": {
      "word": "beautiful",
      "phonetic": "/ˈbjuːtɪfəl/",
      "part_of_speech": "adjective",
      "chinese_translation": "美丽的",
      "english_definition": "pleasing the senses or mind aesthetically",
      "example_sentence": "She has a beautiful voice.",
      "chinese_example": "她有一个美丽的声音。",
      "difficulty_level": "intermediate",
      "frequency_rank": 1250
    }
  },
  "source_stats": {
    "base_library": 1,
    "deepseek_api": 1
  }
}
```

---

### 11. **POST** `/api/words/{word_id}/refresh-info`
**功能**: 刷新已存在单词的详细信息

#### 使用场景
用户想要更新已保存单词的信息，或者信息不准确时重新获取

#### 请求参数
- **Path Parameters**:
  - `word_id`: 单词ID（必填）

#### 响应格式
```json
{
  "success": true,
  "message": "Word information refreshed successfully",
  "word": {
    "id": 15,
    "text": "beautiful",
    "translation": "美丽的",
    "phonetic": "/ˈbjuːtɪfəl/",
    "part_of_speech": "adjective",
    "definition": "pleasing the senses or mind aesthetically",
    "example_sentence": "She has a beautiful voice.",
    "difficulty_level": "intermediate",
    "frequency_rank": 1250,
    "category_id": 2,
    "auto_generated": true,
    "created_at": "2024-01-15T10:30:00.000000",
    "last_updated": "2024-01-15T11:45:00.000000"
  }
}
```

---

### 12. **GET** `/api/words/performance-stats`
**功能**: 获取词汇查询性能统计

#### 响应格式
```json
{
  "success": true,
  "performance_stats": {
    "base_library_size": 14713,
    "translation_coverage": 98.1,
    "phonetic_coverage": 100.0,
    "estimated_hit_rate": 90.5,
    "api_savings": "90.5%"
  }
}
```

---

## 🏠 基础词库管理模块 (`/api/base-words`)

### 概述
基础词库系统提供了14,713个高质量英语词汇的管理和查询功能，每个词汇包含：
- **英文单词**
- **中文翻译** (98%覆盖率)
- **音标** (100%覆盖率)
- **词性**
- **例句**
- **难度等级** (1-3级)
- **词频排名**

### 功能特点
- 🏠 **本地优先**: 存储14,713个英文词汇，优先本地查询
- ⚡ **极速响应**: 本地词汇查询毫秒级响应
- 🔄 **智能降级**: 本地词库没有的词汇自动调用DeepSeek API
- 📈 **自动扩展**: API获取的新词汇自动添加到本地词库
- 📊 **完整统计**: 提供词库覆盖率、来源分析等统计功能

### 1. **GET** `/api/base-words/stats`
**功能**: 获取词库统计信息

#### 响应格式
```json
{
  "success": true,
  "stats": {
    "total_words": 14713,
    "translation_rate": 98.1,
    "phonetic_rate": 100.0,
    "source_distribution": {
      "frequency_import": 11460,
      "google_10000": 2720,
      "ecdict_10k": 292,
      "high_quality_default": 226,
      "ecdict": 15
    },
    "difficulty_distribution": {
      "1": 5234,
      "2": 6891,
      "3": 2588
    },
    "pos_distribution": {
      "noun": 6542,
      "verb": 3891,
      "adjective": 2456,
      "adverb": 1824
    }
  }
}
```

---

### 2. **GET** `/api/base-words/search`
**功能**: 搜索基础词库

#### 请求参数
- **Query Parameters**:
  - `query`: 搜索关键词（必填）
  - `limit`: 返回结果数量限制（可选，默认50，最大100）

#### 响应格式
```json
{
  "success": true,
  "results": [
    {
      "id": 1,
      "word": "hello",
      "translation": "你好",
      "phonetic": "/həˈloʊ/",
      "part_of_speech": "interjection",
      "example_sentence": "Hello, how are you?",
      "difficulty_level": 1,
      "frequency_rank": 1234,
      "source": "frequency_import"
    }
  ],
  "total": 1,
  "query": "hello"
}
```

---

### 3. **GET** `/api/base-words/word/{word}`
**功能**: 获取特定单词

#### 请求参数
- **Path Parameters**:
  - `word`: 要查询的单词（必填）

#### 响应格式
```json
{
  "success": true,
  "word_info": {
    "word": "apple",
    "translation": "苹果",
    "phonetic": "/ˈæpəl/",
    "part_of_speech": "noun",
    "definition": "the round fruit of a tree",
    "frequency_rank": 200,
    "difficulty_level": "elementary",
    "source": "base_library"
  },
  "found_in_base_library": true
}
```

---

### 4. **POST** `/api/base-words/coverage`
**功能**: 检查词汇覆盖率

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "words": ["apple", "banana", "computer", "programming"]
}
```

#### 响应格式
```json
{
  "success": true,
  "coverage": {
    "total_words": 4,
    "covered_words": 3,
    "coverage_rate": 75.0,
    "found_words": ["apple", "banana", "computer"],
    "missing_words": ["programming"],
    "detailed_coverage": [
      {
        "word": "apple",
        "found": true,
        "difficulty_level": "elementary"
      },
      {
        "word": "banana",
        "found": true,
        "difficulty_level": "elementary"
      },
      {
        "word": "computer",
        "found": true,
        "difficulty_level": "intermediate"
      },
      {
        "word": "programming",
        "found": false,
        "difficulty_level": null
      }
    ]
  }
}
```

---

### 5. **GET** `/api/base-words/difficulty/{level}`
**功能**: 按难度获取单词

#### 请求参数
- **Path Parameters**:
  - `level`: 难度等级（必填，1-3）
- **Query Parameters**:
  - `limit`: 返回数量限制（可选，默认100，最大500）

#### 响应格式
```json
{
  "success": true,
  "words": [
    {
      "word": "the",
      "translation": "这个，那个",
      "phonetic": "/ðə/",
      "part_of_speech": "article",
      "example_sentence": "The book is on the table.",
      "frequency_rank": 1
    }
  ],
  "difficulty_level": "1",
  "count": 20
}
```

---

### 6. **GET** `/api/base-words/random`
**功能**: 获取随机单词

#### 请求参数
- **Query Parameters**:
  - `count`: 返回数量（可选，默认10，最大50）
  - `difficulty`: 难度等级过滤（可选，1-3）

#### 响应格式
```json
{
  "success": true,
  "words": [
    {
      "word": "beautiful",
      "translation": "美丽的",
      "phonetic": "/ˈbjuːtɪfl/",
      "part_of_speech": "adjective",
      "example_sentence": "She looks beautiful today.",
      "difficulty_level": 2,
      "frequency_rank": 1456
    }
  ],
  "count": 5,
  "difficulty_level": "2"
}
```

---

### 7. **GET** `/api/base-words/status`
**功能**: 获取词库状态

#### 响应格式
```json
{
  "success": true,
  "status": "excellent",
  "message": "词库状态优秀！包含 14713 个词汇，98% 有翻译",
  "total_words": 14713,
  "translation_rate": 98.1,
  "phonetic_rate": 100.0,
  "source_distribution": {
    "frequency_import": 11460,
    "google_10000": 2720,
    "ecdict_10k": 292
  }
}
```

状态类型:
- `empty`: 词库为空
- `insufficient`: 词汇量不足(<1000)
- `good`: 状态良好(1000-3000)
- `excellent`: 状态优秀(3000+)

---

### 8. **POST** `/api/base-words/word`
**功能**: 添加单词到基础词库

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "word": "innovation",
  "translation": "创新",
  "phonetic": "/ˌɪnəˈveɪʃn/",
  "part_of_speech": "noun",
  "definition": "The action or process of innovating",
  "example_sentence": "Innovation drives technological progress.",
  "difficulty_level": 3,
  "frequency_rank": 2500,
  "source": "manual_input"
}
```

#### 响应格式
```json
{
  "success": true,
  "message": "Word added successfully",
  "word": {
    "id": 14714,
    "word": "innovation",
    "translation": "创新",
    "phonetic": "/ˌɪnəˈveɪʃn/",
    "part_of_speech": "noun",
    "example_sentence": "Innovation drives technological progress.",
    "difficulty_level": 3,
    "frequency_rank": 2500,
    "source": "manual_input",
    "created_at": "2024-01-01T12:00:00"
  }
}
```

---

### 9. **POST** `/api/base-words/bulk-import`
**功能**: 批量导入单词

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "words": [
    {
      "word": "technology",
      "translation": "技术",
      "phonetic": "/tekˈnɑːlədʒi/",
      "part_of_speech": "noun",
      "difficulty_level": 2
    },
    {
      "word": "computer",
      "translation": "电脑",
      "phonetic": "/kəmˈpjuːtər/", 
      "part_of_speech": "noun",
      "difficulty_level": 2
    }
  ],
  "source": "manual_batch_import"
}
```

#### 响应格式
```json
{
  "success": true,
  "message": "Bulk import completed",
  "results": {
    "total_words": 2,
    "imported_count": 2,
    "skipped_count": 0,
    "error_count": 0,
    "imported_words": ["technology", "computer"],
    "skipped_words": [],
    "errors": []
  }
}
```

---

## 📖 故事生成模块 (`/api/stories`)

### 1. **GET** `/api/stories/`
**功能**: 获取故事列表

#### 响应格式
```json
[
  {
    "id": 1,
    "title": "Story with 5 words",
    "englishText": "Once upon a time, there was a brave knight...",
    "highlightedEnglishText": "Once upon a time, there was a <mark>brave</mark> <mark>knight</mark>...",
    "chineseText": "从前，有一个勇敢的骑士...",
    "words": [
      {"id": 1, "text": "brave"},
      {"id": 2, "text": "knight"}
    ],
    "created_at": "2024-01-15T10:30:00.000000"
  }
]
```

---

### 2. **POST** `/api/stories/`
**功能**: 创建故事（使用选定的单词）

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "word_ids": [1, 2, 3, 4],
  "title": "My Custom Story"  // 可选
}
```

#### 响应格式
```json
{
  "id": 1,
  "title": "My Custom Story",
  "englishText": "Generated story text...",
  "chineseText": "生成的故事文本...",
  "words": [
    {"id": 1, "text": "hello", "translation": "你好"},
    {"id": 2, "text": "world", "translation": "世界"}
  ],
  "created_at": "2024-01-15T10:30:00.000000"
}
```

---

### 3. **POST** `/api/stories/generate`
**功能**: 生成故事并保存到数据库

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "word_ids": [1, 2, 3],
  "title": "Generated Story"  // 可选
}
```

#### 响应格式
```json
{
  "english_story": "Generated English story...",
  "chinese_story": "生成的中文故事...",
  "words": [
    {"id": 1, "text": "hello"},
    {"id": 2, "text": "world"}
  ]
}
```

---

### 4. **GET** `/api/stories/{story_id}`
**功能**: 获取故事详情

#### 请求参数
- **Path Parameters**:
  - `story_id`: 故事ID（必填）

#### 响应格式
```json
{
  "id": 1,
  "title": "Story Title",
  "englishText": "Story content...",
  "highlightedEnglishText": "Story <mark>content</mark>...",
  "chineseText": "故事内容...",
  "words": [
    {"id": 1, "text": "content"}
  ],
  "created_at": "2024-01-15T10:30:00.000000"
}
```

---

### 5. **PUT** `/api/stories/{story_id}`
**功能**: 更新故事

#### 请求参数
- **Path Parameters**:
  - `story_id`: 故事ID（必填）
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "title": "Updated Story Title"
}
```

#### 响应格式
```json
{
  "id": 1,
  "title": "Updated Story Title",
  "englishText": "Story content...",
  "chineseText": "故事内容...",
  "words": [
    {"id": 1, "text": "content"}
  ],
  "created_at": "2024-01-15T10:30:00.000000"
}
```

---

### 6. **DELETE** `/api/stories/{story_id}`
**功能**: 删除故事

#### 请求参数
- **Path Parameters**:
  - `story_id`: 故事ID（必填）

#### 响应格式
```json
{
  "message": "Story deleted successfully"
}
```

---

## 🏷️ 分类管理模块 (`/api/categories`)

### 1. **GET** `/api/categories`
**功能**: 获取分类列表（包含单词数量统计）

#### 响应格式
```json
[
  {
    "id": "all",
    "name": "全部单词",
    "wordCount": 50,
    "created_at": null
  },
  {
    "id": 1,
    "name": "基础词汇",
    "wordCount": 25,
    "created_at": "2024-01-15T10:30:00.000000"
  },
  {
    "id": 2,
    "name": "高级词汇",
    "wordCount": 15,
    "created_at": "2024-01-15T10:31:00.000000"
  }
]
```

---

### 2. **POST** `/api/categories`
**功能**: 创建新分类

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "name": "新分类名称"
}
```

#### 响应格式
```json
{
  "id": 3,
  "name": "新分类名称",
  "wordCount": 0,
  "created_at": "2024-01-15T10:32:00.000000"
}
```

#### 错误响应（409 - 分类已存在）
```json
{
  "error": "Category already exists"
}
```

---

### 3. **GET** `/api/categories/{category_id}`
**功能**: 获取分类详情

#### 请求参数
- **Path Parameters**:
  - `category_id`: 分类ID（必填）

#### 响应格式
```json
{
  "id": 1,
  "name": "基础词汇",
  "wordCount": 25,
  "created_at": "2024-01-15T10:30:00.000000"
}
```

---

### 4. **PUT** `/api/categories/{category_id}`
**功能**: 更新分类

#### 请求参数
- **Path Parameters**:
  - `category_id`: 分类ID（必填）
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "name": "更新后的分类名称"
}
```

#### 响应格式
```json
{
  "id": 1,
  "name": "更新后的分类名称",
  "wordCount": 25,
  "created_at": "2024-01-15T10:30:00.000000"
}
```

---

### 5. **DELETE** `/api/categories/{category_id}`
**功能**: 删除分类（分类下的单词将移至未分类）

#### 请求参数
- **Path Parameters**:
  - `category_id`: 分类ID（必填）

#### 响应格式
```json
{
  "message": "Category deleted successfully"
}
```

---

### 6. **GET** `/api/categories/{category_id}/words`
**功能**: 获取分类下的所有单词

#### 请求参数
- **Path Parameters**:
  - `category_id`: 分类ID（必填）

#### 响应格式
```json
[
  {
    "id": 1,
    "text": "hello",
    "translation": "你好",
    "category_id": 1,
    "created_at": "2024-01-15T10:30:00.000000"
  },
  {
    "id": 2,
    "text": "world",
    "translation": "世界",
    "category_id": 1,
    "created_at": "2024-01-15T10:31:00.000000"
  }
]
```

---

## 🌐 翻译服务模块 (`/api/translate`)

### 1. **POST** `/api/translate`
**功能**: 翻译文本

#### 请求参数
- **Content-Type**: `application/json`
- **Body**:
```json
{
  "text": "Hello, world!",
  "source_lang": "en",
  "target_lang": "zh"
}
```

#### 响应格式
```json
{
  "translated_text": "你好，世界！"
}
```

#### 支持的语言代码
- `en`: 英语
- `zh`: 中文
- 其他语言代码根据翻译服务支持情况而定

---

## 📊 性能优势

### 响应时间对比
| 查询类型 | 原有方式 | 增强方式 | 提升 |
|---------|---------|---------|------|
| 常用词汇 | 1-3秒 | 10-50ms | **60-300倍** |
| 批量查询 | 5-15秒 | 100-500ms | **10-50倍** |
| 缓存命中 | N/A | 5-10ms | **极致快速** |

### 成本节约
- **API调用减少**: 90%+ 的常用词汇无需调用外部API
- **网络流量节约**: 大幅减少网络请求
- **用户体验**: 响应更快，离线也能基本使用

---

## 🚀 前端集成指南

### 推荐的使用流程

1. **用户点击选中单词**
   ```javascript
   // 快速获取单词信息展示
   const response = await fetch(`/api/words/info/${selectedWord}`);
   const { word_info, source } = await response.json();
   // 显示音标、释义等信息，标识数据来源
   ```

2. **用户决定添加到单词本**
   ```javascript
   // 智能添加单词
   const response = await fetch('/api/words/add-with-info', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       text: selectedWord,
       category_id: selectedCategoryId
     })
   });
   ```

3. **批量处理多个单词**
   ```javascript
   // 批量获取信息
   const response = await fetch('/api/words/batch-info', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       words: selectedWords
     })
   });
   ```

### 显示数据来源示例

```javascript
const WordInfo = ({ wordData }) => {
  const getSourceBadge = (source) => {
    const badges = {
      'base_library': { text: '本地词库', color: 'success', icon: '⚡' },
      'deepseek_api': { text: 'AI查询', color: 'primary', icon: '🤖' },
      'fallback': { text: '基础信息', color: 'secondary', icon: '📝' }
    };
    return badges[source] || badges.fallback;
  };

  const badge = getSourceBadge(wordData.source);
  
  return (
    <div className="word-card">
      <span className={`badge badge-${badge.color}`}>
        {badge.icon} {badge.text}
      </span>
      <h3>{wordData.word}</h3>
      <p>{wordData.chinese_translation}</p>
    </div>
  );
};
```

### 错误处理建议

```javascript
try {
  const response = await fetch('/api/words/add-with-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: word })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // 成功添加
    showSuccess(data.message);
    displayWordInfo(data.word);
  } else {
    // 处理错误（如单词已存在）
    if (response.status === 409) {
      showInfo(`单词 "${word}" 已存在`);
      displayWordInfo(data.word);
    } else {
      showError(data.error);
    }
  }
} catch (error) {
  showError('网络错误，请重试');
}
```

### 词库状态监控

```javascript
const LibraryStatus = () => {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    fetch('/api/base-words/status')
      .then(res => res.json())
      .then(data => setStatus(data));
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      'excellent': 'success',
      'good': 'warning',
      'insufficient': 'danger',
      'empty': 'secondary'
    };
    return colors[status] || 'secondary';
  };

  return (
    <div className="library-status">
      <div className={`status-indicator ${getStatusColor(status?.status)}`}>
        {status?.message}
      </div>
    </div>
  );
};
```

---

## 🔧 部署指南

### 1. 初始化数据库

```bash
# 创建基础词库表
python scripts/init_base_library.py
```

### 2. 导入基础词汇

```bash
# 下载并导入14,713个词汇
python scripts/vocab_importer.py
```

### 3. 验证部署

```bash
# 检查词库状态
curl "http://localhost:5000/api/base-words/status"

# 检查统计信息
curl "http://localhost:5000/api/base-words/stats"

# 测试词汇查询
curl "http://localhost:5000/api/words/info/hello"
```

---

## ⚠️ 注意事项

### 文件上传限制
- 最大文件大小: 500MB
- 支持的视频格式: mp4, avi, mov, mkv
- 上传目录自动创建: `uploads/videos/`, `uploads/audio/`

### AI功能限制
- 批量查询单词数量限制：20个/次
- 单词格式验证：仅支持英文字母、连字符、撇号
- 需要DeepSeek API密钥配置
- API调用有延迟，建议添加加载状态

### 基础词库特性
- 本地词库包含14,713个高质量词汇
- 翻译覆盖率：98.1%，音标覆盖率：100%
- 优先本地查询，无匹配时降级到AI API
- 支持按难度等级（1-3级）分类
- 词频排名范围：1-10000

### 错误处理
- 所有接口都应检查 `success` 字段
- 4xx错误通常包含 `error` 字段说明具体错误
- 5xx错误表示服务器内部错误
- 对于500错误，建议实现指数退避重试机制

### 性能建议
- 视频处理是异步操作，需要轮询状态
- 大文件上传可能需要较长时间
- 建议对频繁调用的接口实现客户端缓存
- 常用单词查询响应时间：10-50ms
- 建议对基础词库状态定期检查

### 缓存策略
- `/api/base-words/stats`接口数据变化不频繁，建议前端缓存5-10分钟
- 单词详情可以缓存较长时间（1小时以上）
- 网络超时建议设置为10-15秒

### 安全考虑
- 文件上传会进行格式验证
- 文件名会被安全化处理
- 建议在生产环境中添加认证机制
- 基础词库数据建议定期备份

### 向后兼容性
- 🟢 **完全兼容**: 所有现有API保持完全兼容
- 🟢 **渐进增强**: 基础词库为空时自动降级到原有功能
- 🟢 **零破坏性变更**: 新功能为增量式添加

---

**版本**: 2.1.0  
**最后更新**: 2024年1月  
**维护者**: 开发团队