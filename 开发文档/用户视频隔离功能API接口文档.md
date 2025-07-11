# 用户视频隔离功能 API 接口文档

## 📋 概述

本文档描述了为实现用户视频隔离功能所需的API接口修改。目前系统中的视频列表是全局的，所有用户都能看到所有视频，需要修改为用户只能看到和操作自己上传的视频。

### 🎯 目标
- 实现用户视频数据隔离
- 确保用户只能访问自己的视频
- 保护用户隐私和数据安全
- 提供完整的用户专属视频管理功能

### 📊 影响范围
- 视频上传功能
- 视频列表查询
- 视频详情获取
- 视频删除操作
- 视频播放权限

---

## 🗄️ 数据库结构修改

### 1. videos 表结构修改

需要为 `videos` 表添加用户关联字段：

```sql
-- 添加用户ID字段
ALTER TABLE videos ADD COLUMN user_id VARCHAR(36) NOT NULL;

-- 添加外键约束
ALTER TABLE videos ADD CONSTRAINT fk_videos_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 添加索引以优化查询性能
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_user_created ON videos(user_id, created_at DESC);
CREATE INDEX idx_videos_user_status ON videos(user_id, status);
```

### 2. 数据迁移策略

对于现有数据的处理建议：

```sql
-- 方案1：为现有视频创建一个默认管理员用户
INSERT INTO users (id, phone, nickname, created_at) 
VALUES ('admin-user-id', 'admin', '系统管理员', NOW())
ON DUPLICATE KEY UPDATE id=id;

UPDATE videos SET user_id = 'admin-user-id' WHERE user_id IS NULL;

-- 方案2：删除现有测试数据（如果是开发环境）
-- DELETE FROM videos;
```

---

## 🔧 API接口修改

### 1. **新增接口**

#### 1.1 获取用户视频列表
```
GET /api/user/videos
```

**功能**: 获取当前登录用户的视频列表

**认证**: Bearer Token 必需

**请求参数**:
```json
Query Parameters:
{
  "page": 1,          // 页码，默认1
  "per_page": 20,     // 每页数量，默认20，最大50
  "status": "all"     // 可选：all/completed/processing/failed
}
```

**响应格式**:
```json
{
  "success": true,
  "message": "获取用户视频列表成功",
  "data": {
    "videos": [
      {
        "id": "uuid-string",
        "filename": "my_video.mp4",
        "file_size": 1024000,
        "duration": 120.5,
        "status": "completed",
        "progress": 100,
        "subtitles_count": 15,
        "created_at": "2024-01-15T10:30:00.000Z",
        "updated_at": "2024-01-15T10:35:00.000Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "per_page": 20,
      "pages": 2,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

**错误响应**:
```json
// 401 - 未认证
{
  "success": false,
  "error": "authentication_required",
  "message": "请先登录"
}

// 403 - 权限不足
{
  "success": false,
  "error": "insufficient_permissions",
  "message": "权限不足"
}
```

#### 1.2 获取用户视频详情
```
GET /api/user/videos/{video_id}
```

**功能**: 获取指定视频的详细信息（仅限用户自己的视频）

**认证**: Bearer Token 必需

**路径参数**:
- `video_id`: 视频ID（UUID格式）

**响应格式**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "filename": "my_video.mp4",
    "original_filename": "原始文件名.mp4",
    "file_size": 1024000,
    "file_hash": "sha256-hash",
    "duration": 120.5,
    "status": "completed",
    "progress": 100,
    "subtitles_count": 15,
    "processing_log": "处理日志信息",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:35:00.000Z",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "codec": "h264"
    }
  }
}
```

#### 1.3 删除用户视频
```
DELETE /api/user/videos/{video_id}
```

**功能**: 删除指定视频及其相关数据（仅限用户自己的视频）

**认证**: Bearer Token 必需

**路径参数**:
- `video_id`: 视频ID（UUID格式）

**响应格式**:
```json
{
  "success": true,
  "message": "视频删除成功",
  "data": {
    "deleted_files": [
      "videos/uuid/video.mp4",
      "subtitles/uuid/subtitles.json"
    ],
    "failed_files": [],
    "cleanup_summary": {
      "video_file": true,
      "subtitle_file": true,
      "database_record": true
    }
  }
}
```

### 2. **修改现有接口**

#### 2.1 视频上传接口修改
```
POST /api/videos/upload
```

**修改内容**: 在创建视频记录时关联当前用户

**Python 实现示例**:
```python
@app.route('/api/videos/upload', methods=['POST'])
@token_required
def upload_video(current_user):
    try:
        file = request.files['file']
        if not file:
            return jsonify({'success': False, 'message': '没有上传文件'}), 400
        
        # 生成唯一ID
        video_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())
        
        # 保存文件
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # 创建视频记录 - 关键修改：添加 user_id
        video = Video(
            id=video_id,
            filename=filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            user_id=current_user.id,  # 关联当前用户
            status='pending',
            created_at=datetime.utcnow()
        )
        
        db.session.add(video)
        db.session.commit()
        
        # 启动异步处理任务
        process_video_async.delay(video_id, task_id)
        
        return jsonify({
            'success': True,
            'message': 'Video uploaded successfully',
            'video_id': video_id,
            'videoId': video_id,
            'taskId': task_id,
            'videoUrl': f'/api/videos/{video_id}/stream'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
```

#### 2.2 视频字幕接口修改
```
GET /api/videos/{video_id}/subtitles
```

**修改内容**: 添加用户权限检查

**Python 实现示例**:
```python
@app.route('/api/videos/<video_id>/subtitles', methods=['GET'])
@token_required
def get_video_subtitles(current_user, video_id):
    # 检查视频是否属于当前用户
    video = Video.query.filter_by(id=video_id, user_id=current_user.id).first()
    if not video:
        return jsonify({
            'success': False, 
            'message': '视频不存在或无访问权限'
        }), 404
    
    # 获取字幕数据
    subtitles = Subtitle.query.filter_by(video_id=video_id).order_by(Subtitle.start_time).all()
    
    return jsonify({
        'success': True,
        'data': [subtitle.to_dict() for subtitle in subtitles]
    })
```

#### 2.3 视频流播放接口修改
```
GET /api/videos/{video_id}/stream
```

**修改内容**: 添加用户权限检查

**Python 实现示例**:
```python
@app.route('/api/videos/<video_id>/stream')
@token_required
def stream_video(current_user, video_id):
    # 检查视频是否属于当前用户
    video = Video.query.filter_by(id=video_id, user_id=current_user.id).first()
    if not video:
        return jsonify({
            'success': False, 
            'message': '视频不存在或无访问权限'
        }), 404
    
    # 流式传输视频文件
    return send_file(video.file_path, as_attachment=False)
```

#### 2.4 视频处理状态接口修改
```
GET /api/videos/status/{task_id}
```

**修改内容**: 添加用户权限检查

**Python 实现示例**:
```python
@app.route('/api/videos/status/<task_id>')
@token_required  
def get_processing_status(current_user, task_id):
    # 通过task_id找到对应的视频
    video = Video.query.filter_by(task_id=task_id, user_id=current_user.id).first()
    if not video:
        return jsonify({
            'success': False,
            'message': '任务不存在或无访问权限'
        }), 404
    
    return jsonify({
        'success': True,
        'taskId': task_id,
        'videoId': video.id,
        'status': video.status,
        'progress': video.progress,
        'message': video.processing_message
    })
```

### 3. **弃用接口**

以下全局视频接口将被弃用或限制访问：

```
GET /api/videos          # 弃用：改为使用 /api/user/videos
DELETE /api/videos/{id}  # 弃用：改为使用 /api/user/videos/{id}
```

---

## 🔒 权限控制

### 1. 认证中间件

所有用户视频相关接口都需要使用认证中间件：

```python
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'success': False, 'message': '缺少认证令牌'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'success': False, 'message': '用户不存在'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': '令牌已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': '无效令牌'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated
```

### 2. 用户权限检查

每个视频操作都需要验证用户权限：

```python
def check_video_ownership(user_id, video_id):
    """检查视频是否属于指定用户"""
    video = Video.query.filter_by(id=video_id, user_id=user_id).first()
    return video is not None

def get_user_video_or_404(user_id, video_id):
    """获取用户视频或返回404"""
    video = Video.query.filter_by(id=video_id, user_id=user_id).first()
    if not video:
        abort(404)
    return video
```

---

## 📊 性能优化建议

### 1. 数据库索引

```sql
-- 复合索引优化用户视频查询
CREATE INDEX idx_videos_user_status_created ON videos(user_id, status, created_at DESC);
CREATE INDEX idx_videos_user_filename ON videos(user_id, filename);

-- 字幕表关联索引
CREATE INDEX idx_subtitles_video_user ON subtitles(video_id) 
INCLUDE (start_time, end_time);
```

### 2. 查询优化

```python
# 使用连接查询优化视频列表获取
def get_user_videos_optimized(user_id, page=1, per_page=20):
    query = db.session.query(Video).options(
        joinedload(Video.subtitles)  # 预加载字幕数据
    ).filter_by(user_id=user_id)
    
    return query.order_by(Video.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
```

### 3. 缓存策略

```python
from flask_caching import Cache

# 缓存用户视频统计信息
@cache.memoize(timeout=300)  # 5分钟缓存
def get_user_video_stats(user_id):
    return {
        'total_videos': Video.query.filter_by(user_id=user_id).count(),
        'completed_videos': Video.query.filter_by(
            user_id=user_id, status='completed'
        ).count(),
        'processing_videos': Video.query.filter_by(
            user_id=user_id, status='processing'
        ).count()
    }
```

---

## 🧪 测试用例

### 1. 单元测试

```python
import unittest
from app import app, db
from models import User, Video

class UserVideoTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()
        db.create_all()
        
        # 创建测试用户
        self.user1 = User(id='user1', phone='13800000001', nickname='用户1')
        self.user2 = User(id='user2', phone='13800000002', nickname='用户2')
        db.session.add_all([self.user1, self.user2])
        
        # 创建测试视频
        self.video1 = Video(id='video1', filename='test1.mp4', user_id='user1')
        self.video2 = Video(id='video2', filename='test2.mp4', user_id='user2')
        db.session.add_all([self.video1, self.video2])
        db.session.commit()
    
    def test_user_can_only_see_own_videos(self):
        """测试用户只能看到自己的视频"""
        # 用户1登录
        token1 = self.get_auth_token('user1')
        
        response = self.app.get('/api/user/videos', 
                              headers={'Authorization': f'Bearer {token1}'})
        
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['data']['videos']), 1)
        self.assertEqual(data['data']['videos'][0]['id'], 'video1')
    
    def test_user_cannot_access_others_videos(self):
        """测试用户不能访问其他用户的视频"""
        token1 = self.get_auth_token('user1')
        
        response = self.app.get('/api/user/videos/video2',
                              headers={'Authorization': f'Bearer {token1}'})
        
        self.assertEqual(response.status_code, 404)
```

### 2. 集成测试

```python
def test_video_upload_with_user_association(self):
    """测试视频上传时正确关联用户"""
    token = self.get_auth_token('user1')
    
    with open('test_video.mp4', 'rb') as f:
        response = self.app.post('/api/videos/upload',
            data={'file': f},
            headers={'Authorization': f'Bearer {token}'}
        )
    
    self.assertEqual(response.status_code, 200)
    
    # 验证视频已关联到正确用户
    video = Video.query.filter_by(filename='test_video.mp4').first()
    self.assertEqual(video.user_id, 'user1')
```

---

## 🚀 部署检查清单

### 1. 数据库迁移
- [ ] 执行表结构修改SQL
- [ ] 创建必要的索引
- [ ] 处理现有数据迁移
- [ ] 验证外键约束

### 2. 代码部署
- [ ] 更新所有视频相关接口
- [ ] 添加新的用户视频接口
- [ ] 更新权限检查中间件
- [ ] 部署前端接口调用修改

### 3. 测试验证
- [ ] 用户登录后只能看到自己的视频
- [ ] 用户无法访问其他用户的视频
- [ ] 视频上传正确关联当前用户
- [ ] 视频删除只能删除自己的视频
- [ ] 性能测试（大量用户和视频）

### 4. 监控告警
- [ ] 添加用户视频访问日志
- [ ] 监控异常权限访问尝试
- [ ] 性能指标监控
- [ ] 错误率告警

---

## 📞 技术支持

如有任何问题，请联系开发团队：

- **开发负责人**: [姓名]
- **技术邮箱**: [邮箱]
- **文档版本**: v1.0
- **最后更新**: 2024-01-15

---

## 📝 变更日志

| 版本 | 日期 | 变更内容 | 负责人 |
|------|------|----------|--------|
| v1.0 | 2024-01-15 | 初始版本，用户视频隔离功能设计 | [姓名] | 