# 学习功能API接口文档

## 📋 概述

学习功能API提供基于视频字幕的有计划背单词学习体验，包括字幕增强、AI问题生成、学习记录跟踪等功能。

**基础URL**: `http://localhost:5000/api/learning`

**版本**: v2.0.0

**特性**:
- 🎯 基于视频字幕的学习会话管理
- 🔍 智能单词高亮和定义显示
- 🤖 AI驱动的理解问题生成
- 📚 学习故事创作
- 📊 单词记忆状态跟踪
- 🔄 完整的学习进度管理

---

## 🔐 认证

当前版本暂不需要认证，所有接口均为公开访问。

---

## 📝 通用响应格式

### 成功响应
```json
{
    "success": true,
    "message": "操作描述信息",
    "data": {
        // 具体数据内容
    }
}
```

### 错误响应
```json
{
    "success": false,
    "error": "错误描述信息"
}
```

### HTTP状态码
- `200` - 请求成功
- `201` - 创建成功
- `400` - 请求参数错误
- `404` - 资源不存在
- `500` - 服务器内部错误

---

## 🎯 核心接口

### 1. 创建学习会话

创建基于特定视频的学习会话。

**端点**: `POST /videos/{video_id}/learning-session`

**路径参数**:
- `video_id` (string, required) - 视频ID

**请求体**:
```json
{
    "show_chinese": true,
    "show_english": true,
    "user_id": "user123"
}
```

**参数说明**:
- `show_chinese` (boolean, optional, default: true) - 是否显示中文字幕
- `show_english` (boolean, optional, default: true) - 是否显示英文字幕
- `user_id` (string, optional) - 用户ID，用于多用户支持

**响应示例**:
```json
{
    "success": true,
    "message": "Learning session created successfully",
    "data": {
        "session_id": "abc123-def456-ghi789",
        "video_id": "video_001",
        "config": {
            "show_chinese": true,
            "show_english": true,
            "user_id": "user123"
        },
        "status": "active",
        "created_at": "2024-12-20T10:30:00Z"
    }
}
```

**cURL示例**:
```bash
curl -X POST "http://localhost:5000/api/learning/videos/video_001/learning-session" \
  -H "Content-Type: application/json" \
  -d '{
    "show_chinese": true,
    "show_english": true
  }'
```

---

### 2. 获取增强字幕

获取高亮已学单词的字幕内容，支持分页。

**端点**: `GET /sessions/{session_id}/subtitles`

**路径参数**:
- `session_id` (string, required) - 学习会话ID

**查询参数**:
- `page` (integer, optional, default: 1) - 页码
- `per_page` (integer, optional, default: 50, max: 100) - 每页数量

**响应示例**:
```json
{
    "success": true,
    "data": {
        "session_id": "abc123-def456-ghi789",
        "video_info": {
            "id": "video_001",
            "filename": "english_lesson.mp4",
            "duration": 120.5,
            "created_at": "2024-12-20T09:00:00Z"
        },
        "config": {
            "show_chinese": true,
            "show_english": true
        },
        "subtitles": [
            {
                "id": 1,
                "start_time": 0.5,
                "end_time": 3.2,
                "chinese_text": "你好，欢迎来到英语学习课程",
                "english_text": "Hello, welcome to the English learning course",
                "highlighted_english": "Hello, <span class=\"learned-word\" data-word=\"welcome\" title=\"欢迎\">welcome</span> to the English learning course",
                "word_definitions": {
                    "welcome": {
                        "translation": "欢迎",
                        "phonetic": "/ˈwelkəm/",
                        "part_of_speech": "verb",
                        "source": "base_library"
                    }
                }
            }
        ],
        "pagination": {
            "page": 1,
            "per_page": 50,
            "total": 15,
            "pages": 1,
            "has_prev": false,
            "has_next": false
        },
        "learning_stats": {
            "total_learned_words": 45,
            "session_status": "active"
        }
    }
}
```

**cURL示例**:
```bash
curl "http://localhost:5000/api/learning/sessions/abc123-def456-ghi789/subtitles?page=1&per_page=20"
```

---

### 3. 生成学习问题

基于视频内容生成AI理解问题。

**端点**: `POST /sessions/{session_id}/questions/generate`

**路径参数**:
- `session_id` (string, required) - 学习会话ID

**请求体**:
```json
{
    "count": 5
}
```

**参数说明**:
- `count` (integer, optional, default: 5, max: 10) - 生成问题数量

**响应示例**:
```json
{
    "success": true,
    "message": "Generated 5 questions successfully",
    "data": [
        {
            "id": 101,
            "question": "What is the main topic discussed in this video?",
            "type": "comprehension",
            "hint": "Think about the overall theme and key points mentioned.",
            "source": "deepseek"
        },
        {
            "id": 102,
            "question": "Choose three new words from the content and use them in sentences.",
            "type": "vocabulary",
            "hint": "Focus on words that are new to you and practice using them.",
            "source": "template"
        }
    ]
}
```

**问题类型**:
- `comprehension` - 理解题
- `vocabulary` - 词汇题
- `grammar` - 语法题

**cURL示例**:
```bash
curl -X POST "http://localhost:5000/api/learning/sessions/abc123-def456-ghi789/questions/generate" \
  -H "Content-Type: application/json" \
  -d '{"count": 3}'
```

---

### 4. 提交问题答案

记录用户对学习问题的答案。

**端点**: `POST /questions/{question_id}/answer`

**路径参数**:
- `question_id` (integer, required) - 问题ID

**请求体**:
```json
{
    "answer": "The main topic is about English vocabulary learning through videos.",
    "time_spent": 45
}
```

**参数说明**:
- `answer` (string, required) - 用户答案
- `time_spent` (integer, optional) - 答题耗时（秒）

**响应示例**:
```json
{
    "success": true,
    "message": "Answer recorded successfully",
    "data": {
        "answer_id": 201,
        "evaluation": {
            "is_correct": null,
            "confidence_score": 0.5,
            "feedback": "Your answer has been recorded. Great job participating!"
        },
        "question_type": "comprehension",
        "recorded_at": "2024-12-20T10:45:00Z"
    }
}
```

**cURL示例**:
```bash
curl -X POST "http://localhost:5000/api/learning/questions/101/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "The video teaches vocabulary through subtitles",
    "time_spent": 30
  }'
```

---

### 5. 生成学习故事

为学习会话生成包含目标单词的英文故事。

**端点**: `POST /sessions/{session_id}/story`

**路径参数**:
- `session_id` (string, required) - 学习会话ID

**请求体**:
```json
{
    "words": ["welcome", "learning", "practice", "improve"]
}
```

**参数说明**:
- `words` (array, optional, max: 15) - 临时选择的单词列表。如不提供，系统自动从学习记录中获取

**响应示例**:
```json
{
    "success": true,
    "message": "Story generated successfully",
    "data": {
        "session_id": "abc123-def456-ghi789",
        "story": {
            "english_text": "Sarah felt welcome when she joined the new learning program. Through daily practice, she began to improve her English skills significantly.",
            "chinese_text": "莎拉加入新的学习项目时感到很受欢迎。通过每天的练习，她的英语技能开始显著提高。",
            "words_used": ["welcome", "learning", "practice", "improve"],
            "word_count": 4
        },
        "generated_at": "2024-12-20T10:50:00Z"
    }
}
```

**cURL示例**:
```bash
curl -X POST "http://localhost:5000/api/learning/sessions/abc123-def456-ghi789/story" \
  -H "Content-Type: application/json" \
  -d '{
    "words": ["welcome", "learning", "practice"]
  }'
```

---

### 6. 记录单词记忆状态

记录用户对单词的记忆掌握情况。

**端点**: `POST /sessions/{session_id}/words/memory`

**路径参数**:
- `session_id` (string, required) - 学习会话ID

**请求体**:
```json
{
    "words": [
        {
            "word": "welcome",
            "remembered": true,
            "confidence_level": 4
        },
        {
            "word": "practice",
            "remembered": false,
            "confidence_level": 2
        }
    ]
}
```

**参数说明**:
- `words` (array, required, max: 50) - 单词记忆状态列表
  - `word` (string, required) - 单词文本
  - `remembered` (boolean, optional) - 是否记住
  - `confidence_level` (integer, optional, 1-5) - 掌握信心等级

**响应示例**:
```json
{
    "success": true,
    "message": "Word memory recorded successfully",
    "data": {
        "session_id": "abc123-def456-ghi789",
        "records_saved": 2,
        "words_remembered": 1,
        "words_not_remembered": 1,
        "memory_rate": 50.0,
        "processed_at": "2024-12-20T11:00:00Z"
    }
}
```

**cURL示例**:
```bash
curl -X POST "http://localhost:5000/api/learning/sessions/abc123-def456-ghi789/words/memory" \
  -H "Content-Type: application/json" \
  -d '{
    "words": [
      {"word": "welcome", "remembered": true, "confidence_level": 4},
      {"word": "practice", "remembered": false, "confidence_level": 2}
    ]
  }'
```

---

### 7. 完成学习会话

标记学习会话为完成状态并获取学习统计。

**端点**: `POST /sessions/{session_id}/complete`

**路径参数**:
- `session_id` (string, required) - 学习会话ID

**响应示例**:
```json
{
    "success": true,
    "message": "Learning session completed successfully",
    "data": {
        "session_id": "abc123-def456-ghi789",
        "completed_at": "2024-12-20T11:30:00Z",
        "duration_minutes": 60.0,
        "statistics": {
            "questions_generated": 5,
            "questions_answered": 4,
            "words_reviewed": 8,
            "words_remembered": 6,
            "completion_rate": 80.0,
            "memory_rate": 75.0
        }
    }
}
```

**cURL示例**:
```bash
curl -X POST "http://localhost:5000/api/learning/sessions/abc123-def456-ghi789/complete"
```

---

## 📊 辅助接口

### 8. 获取会话信息

获取学习会话的详细信息和进度。

**端点**: `GET /sessions/{session_id}`

**响应示例**:
```json
{
    "success": true,
    "data": {
        "session": {
            "id": "abc123-def456-ghi789",
            "video_id": "video_001",
            "status": "active",
            "show_chinese": true,
            "show_english": true,
            "created_at": "2024-12-20T10:30:00Z",
            "last_activity": "2024-12-20T11:00:00Z"
        },
        "progress": {
            "session_id": "abc123-def456-ghi789",
            "status": "active",
            "steps_completed": {
                "subtitles_viewed": true,
                "questions_generated": true,
                "questions_answered": true,
                "words_reviewed": true
            },
            "statistics": {
                "questions_generated": 5,
                "questions_answered": 4,
                "words_reviewed": 8,
                "answer_rate": 80.0
            }
        }
    }
}
```

### 9. 获取会话问题列表

获取学习会话的所有问题。

**端点**: `GET /sessions/{session_id}/questions`

**响应示例**:
```json
{
    "success": true,
    "data": {
        "session_id": "abc123-def456-ghi789",
        "questions": [
            {
                "id": 101,
                "question_text": "What is the main topic discussed in this video?",
                "question_type": "comprehension",
                "hint": "Think about the overall theme and key points mentioned.",
                "source": "deepseek",
                "answers_count": 1,
                "has_answers": true,
                "created_at": "2024-12-20T10:40:00Z"
            }
        ],
        "total_questions": 5
    }
}
```

### 10. 健康检查

检查学习服务的运行状态。

**端点**: `GET /health`

**响应示例**:
```json
{
    "success": true,
    "service": "learning",
    "status": "healthy",
    "timestamp": "2024-12-20T12:00:00Z",
    "components": {
        "question_service": {
            "service_status": "available",
            "api_available": true,
            "has_openai_package": true,
            "has_api_key": true,
            "supported_question_types": ["comprehension", "vocabulary", "grammar"],
            "max_questions_per_request": 10,
            "fallback_templates_count": 7
        },
        "word_service": {
            "base_library_size": 14713,
            "estimated_hit_rate": 90.5
        }
    }
}
```

---

## 🔄 学习流程示例

### 完整学习流程
```bash
# 1. 创建学习会话
curl -X POST "http://localhost:5000/api/learning/videos/video_001/learning-session" \
  -H "Content-Type: application/json" \
  -d '{"show_chinese": true, "show_english": true}'

# 2. 获取增强字幕
curl "http://localhost:5000/api/learning/sessions/{session_id}/subtitles"

# 3. 生成学习问题
curl -X POST "http://localhost:5000/api/learning/sessions/{session_id}/questions/generate" \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'

# 4. 提交问题答案
curl -X POST "http://localhost:5000/api/learning/questions/{question_id}/answer" \
  -H "Content-Type: application/json" \
  -d '{"answer": "答案内容"}'

# 5. 生成学习故事
curl -X POST "http://localhost:5000/api/learning/sessions/{session_id}/story" \
  -H "Content-Type: application/json" \
  -d '{"words": ["word1", "word2"]}'

# 6. 记录单词记忆状态
curl -X POST "http://localhost:5000/api/learning/sessions/{session_id}/words/memory" \
  -H "Content-Type: application/json" \
  -d '{"words": [{"word": "example", "remembered": true}]}'

# 7. 完成学习会话
curl -X POST "http://localhost:5000/api/learning/sessions/{session_id}/complete"
```

---

## ⚠️ 错误处理

### 常见错误

**404 - 资源不存在**
```json
{
    "success": false,
    "error": "Learning session abc123 not found"
}
```

**400 - 参数错误**
```json
{
    "success": false,
    "error": "count must be an integer between 1 and 10"
}
```

**500 - 服务器错误**
```json
{
    "success": false,
    "error": "Failed to generate questions"
}
```

### 降级处理

当DeepSeek API不可用时，系统会自动降级：
- 问题生成：使用预定义模板问题
- 单词查询：仅使用本地词库
- 故事生成：提供基础故事模板

---

## 🔧 配置选项

### 环境变量
```bash
# DeepSeek API配置
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_BASE=https://api.deepseek.com
API_TIMEOUT=10
API_RETRY_COUNT=3

# 学习功能配置
LEARNING_SESSION_TIMEOUT=24
MAX_QUESTIONS_PER_REQUEST=10
MAX_WORDS_MEMORY_PER_REQUEST=50
MAX_STORY_WORDS=15
DEFAULT_SUBTITLES_PER_PAGE=50
MAX_SUBTITLES_PER_PAGE=100

# 性能配置
CACHE_TIMEOUT=3600
WORD_CACHE_SIZE=10000
MAX_CONCURRENT_API_CALLS=5
```

---

## 📚 SDK示例

### JavaScript/TypeScript
```typescript
class LearningAPI {
    private baseUrl = 'http://localhost:5000/api/learning';
    
    async createSession(videoId: string, config: SessionConfig) {
        const response = await fetch(`${this.baseUrl}/videos/${videoId}/learning-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return await response.json();
    }
    
    async getSubtitles(sessionId: string, page = 1) {
        const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/subtitles?page=${page}`);
        return await response.json();
    }
    
    async generateQuestions(sessionId: string, count = 5) {
        const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/questions/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count })
        });
        return await response.json();
    }
}
```

### Python
```python
import requests

class LearningAPI:
    def __init__(self, base_url='http://localhost:5000/api/learning'):
        self.base_url = base_url
    
    def create_session(self, video_id, config):
        response = requests.post(
            f'{self.base_url}/videos/{video_id}/learning-session',
            json=config
        )
        return response.json()
    
    def get_subtitles(self, session_id, page=1):
        response = requests.get(
            f'{self.base_url}/sessions/{session_id}/subtitles',
            params={'page': page}
        )
        return response.json()
    
    def generate_questions(self, session_id, count=5):
        response = requests.post(
            f'{self.base_url}/sessions/{session_id}/questions/generate',
            json={'count': count}
        )
        return response.json()
```

---

## 📝 更新日志

### v2.0.0 (2024-12-20)
- ✅ 新增学习会话管理功能
- ✅ 实现智能字幕高亮和单词定义
- ✅ 集成AI驱动的问题生成系统
- ✅ 添加个性化学习记录跟踪
- ✅ 优化词汇服务性能和缓存策略
- ✅ 完善错误处理和降级机制

---

## 🚀 快速开始

1. **启动服务**
   ```bash
   python run.py
   ```

2. **验证服务状态**
   ```bash
   curl http://localhost:5000/api/learning/health
   ```

3. **创建第一个学习会话**
   ```bash
   curl -X POST "http://localhost:5000/api/learning/videos/your_video_id/learning-session" \
     -H "Content-Type: application/json" \
     -d '{"show_chinese": true, "show_english": true}'
   ```

4. **开始学习！** 🎉

---

## 💡 最佳实践

1. **会话管理**: 及时完成学习会话以获取完整统计
2. **分页使用**: 大量字幕时使用分页避免性能问题
3. **错误处理**: 实现客户端重试机制应对网络问题
4. **缓存策略**: 缓存单词定义减少重复查询
5. **用户体验**: 提供加载状态和降级提示

---

**文档版本**: v2.0.0  
**最后更新**: 2024年12月20日  
**技术支持**: 开发团队 