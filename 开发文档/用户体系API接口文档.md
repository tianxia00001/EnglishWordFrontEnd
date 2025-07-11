# 英语学习助手 · 完整API接口文档
版本：v3.0.0 | 更新时间：2024-12-20

## 📋 接口概览

### 基础信息
- **开发环境**: `http://localhost:5000`
- **生产环境**: `https://api.yourdomain.com`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`

### 用户等级说明
| 用户类型 | 功能权限 | 配额限制 |
|----------|----------|----------|
| 匿名用户 | 基础体验 | 部分功能，无数据保存 |
| 免费用户 | 标准功能 | 每日配额限制 |
| VIP会员 | 全部功能 | 无限制使用 |

### 认证方式
- **无需认证**: 匿名访问，功能受限
- **Bearer Token**: 登录用户，完整功能
- **格式**: `Authorization: Bearer {jwt_token}`

### 通用响应格式
```json
{
    "success": true,
    "message": "操作成功",
    "data": {},
    "error": null
}
```

### 错误码定义
| HTTP状态码 | 错误类型 | 描述 |
|------------|----------|------|
| 200 | 成功 | 请求成功 |
| 400 | 请求错误 | 参数错误或格式不正确 |
| 401 | 未授权 | 需要登录或token无效 |
| 403 | 禁止访问 | 权限不足 |
| 404 | 资源不存在 | 请求的资源不存在 |
| 409 | 资源冲突 | 数据重复或冲突 |
| 429 | 请求过频繁 | 超出配额限制 |
| 500 | 服务器错误 | 内部服务器错误 |

## 🔐 用户认证接口

### 1. 发送验证码  
**接口**: `POST /api/auth/send-code`  
**认证**: 无需认证

**请求参数**:
```json
{
    "phone": "13800138000"   // 必填，中国大陆手机号格式
}
```

**成功响应** (200):
```json
{
    "success": true,
    "message": "验证码已发送(测试环境自动返回)",
    "data": {
        "phone": "13800138000",
        "verification_code": "123456"  // 仅测试环境返回
    }
}
```

**错误响应**:
```json
// 429 - 请求过于频繁
{
    "success": false,
    "error": "too_many_requests",
    "message": "请稍后再试"
}
```

### 2. 用户注册
**接口**: `POST /api/auth/register`  
**认证**: 无需认证

**请求参数**:
```json
{
    "phone": "13800138000",         // 必填
    "verification_code": "123456",   // 必填
    "nickname": "测试用户"            // 可选
}
```

**成功响应** (200):
```json
{
    "success": true,
    "message": "注册成功",
    "data": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "phone": "13800138000",
        "nickname": "测试用户",
        "membership_type": "free",
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOi...",
        "expires_in": 86400
    }
}
```

**错误响应**:
```json
// 409 - 手机号已注册
{
    "success": false,
    "error": "phone_exists",
    "message": "手机号已注册"
}

// 400 - 验证码无效
{
    "success": false,
    "error": "invalid_code",
    "message": "验证码错误或已过期"
}
```

### 3. 用户登录
**接口**: `POST /api/auth/login`  
**认证**: 无需认证

**请求参数**:
```json
{
    "phone": "13800138000",       // 必填
    "verification_code": "123456" // 必填
}
```

**成功响应** (200):
```json
{
    "success": true,
    "message": "登录成功",
    "data": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "phone": "13800138000",
        "nickname": "测试用户",
        "membership_type": "vip",
        "is_vip_active": true,
        "vip_expires_at": "2025-01-20T10:15:00Z",
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOi...",
        "expires_in": 86400,
        "daily_quotas": {
            "learning_sessions": {"used": 3, "limit": 999, "remaining": 996},
            "ai_questions": {"used": 5, "limit": 999, "remaining": 994},
            "story_generations": {"used": 1, "limit": 999, "remaining": 998},
            "personal_words": {"used": 150, "limit": 999, "remaining": 849}
        }
    }
}
```

**错误响应**:
```json
// 401 - 登录失败
{
    "success": false,
    "error": "invalid_code",
    "message": "验证码错误或已过期"
}
```

### 4. 获取用户信息
**接口**: `GET /api/auth/profile`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "phone": "13800138000",
        "nickname": "测试用户",
        "avatar_url": "https://example.com/avatar.jpg",
        "membership_type": "free",
        "is_vip_active": false,
        "vip_expires_at": null,
        "created_at": "2024-12-01T10:00:00Z",
        "last_login": "2024-12-20T08:30:00Z",
        "daily_quotas": {
            "learning_sessions": {"used": 3, "limit": 5, "remaining": 2},
            "ai_questions": {"used": 8, "limit": 10, "remaining": 2},
            "story_generations": {"used": 3, "limit": 3, "remaining": 0},
            "personal_words": {"used": 45, "limit": 200, "remaining": 155}
        },
        "statistics": {
            "total_learning_sessions": 25,
            "total_words_learned": 120,
            "total_study_time": 1800
        }
    }
}
```

### 5. 更新用户信息
**接口**: `PUT /api/auth/profile`  
**认证**: Bearer Token必需

**请求参数**:
```json
{
    "nickname": "新昵称",
    "avatar_url": "https://example.com/new-avatar.jpg"
}
```

**成功响应** (200):
```json
{
    "success": true,
    "message": "用户信息更新成功",
    "data": {
        "nickname": "新昵称",
        "avatar_url": "https://example.com/new-avatar.jpg"
    }
}
```

### 6. 刷新Token
**接口**: `POST /api/auth/refresh`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOi...",
        "expires_in": 86400
    }
}
```

### 7. 用户登出
**接口**: `POST /api/auth/logout`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "message": "登出成功"
}
```

## 💳 会员体系接口

### 1. 获取会员套餐
**接口**: `GET /api/membership/plans`  
**认证**: 无需认证

**成功响应** (200):
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "plan_type": "monthly",
            "name": "VIP月卡",
            "duration_days": 30,
            "original_price": 29.90,
            "current_price": 19.90,
            "discount_text": "限时优惠 33% OFF",
            "features": [
                "无限学习会话",
                "无限AI问题生成", 
                "无限故事生成",
                "个人单词本无限制",
                "专属学习内容",
                "离线下载功能",
                "学习数据分析"
            ],
            "is_popular": false
        },
        {
            "id": 2,
            "plan_type": "yearly",
            "name": "VIP年卡",
            "duration_days": 365,
            "original_price": 298.00,
            "current_price": 199.00,
            "discount_text": "立省99元",
            "features": [
                "月卡所有功能",
                "专属客服支持",
                "优先新功能体验"
            ],
            "is_popular": true
        }
    ]
}
```

### 2. 创建订单
**接口**: `POST /api/membership/orders`  
**认证**: Bearer Token必需

**请求参数**:
```json
{
    "plan_id": 1
}
```

**成功响应** (200):
```json
{
    "success": true,
    "message": "订单创建成功",
    "data": {
        "order_no": "ORDER_20241220_001",
        "plan_id": 1,
        "plan_name": "VIP月卡",
        "amount": 19.90,
        "status": "pending",
        "expires_at": "2024-12-20T11:30:00Z",
        "created_at": "2024-12-20T10:30:00Z"
    }
}
```

**错误响应**:
```json
// 409 - 已有未支付订单
{
    "success": false,
    "error": "pending_order_exists", 
    "message": "您有未完成的订单，请先完成支付"
}
```

### 3. 发起支付
**接口**: `POST /api/membership/payments`  
**认证**: Bearer Token必需

**请求参数**:
```json
{
    "order_no": "ORDER_20241220_001",
    "payment_method": "alipay"  // alipay/wechat
}
```

**成功响应** (200):
```json
// 支付宝
{
    "success": true,
    "message": "支付链接生成成功",
    "data": {
        "payment_method": "alipay",
        "payment_url": "https://openapi.alipay.com/gateway.do?...",
        "qr_code": null,
        "expires_at": "2024-12-20T11:00:00Z"
    }
}

// 微信支付
{
    "success": true,
    "message": "支付二维码生成成功", 
    "data": {
        "payment_method": "wechat",
        "payment_url": null,
        "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
        "expires_at": "2024-12-20T11:00:00Z"
    }
}
```

### 4. 查询支付状态
**接口**: `GET /api/membership/payments/{order_no}/status`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
// 支付成功
{
    "success": true,
    "data": {
        "order_no": "ORDER_20241220_001",
        "status": "success",  // pending/success/failed/expired
        "paid_at": "2024-12-20T10:45:00Z",
        "amount": 19.90,
        "payment_method": "alipay",
        "vip_info": {
            "is_active": true,
            "activated_at": "2024-12-20T10:45:00Z",
            "expires_at": "2025-01-20T10:45:00Z"
        }
    }
}

// 支付中状态
{
    "success": true,
    "data": {
        "order_no": "ORDER_20241220_001",
        "status": "pending",
        "paid_at": null,
        "amount": 19.90
    }
}
```

### 5. 获取订单历史
**接口**: `GET /api/membership/orders?page=1&per_page=10`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "orders": [
            {
                "order_no": "ORDER_20241220_001",
                "plan_name": "VIP月卡",
                "amount": 19.90,
                "status": "success",
                "created_at": "2024-12-20T10:30:00Z",
                "paid_at": "2024-12-20T10:45:00Z"
            }
        ],
        "total": 1,
        "page": 1,
        "per_page": 10,
        "pages": 1
    }
}
```

### 6. 获取会员状态
**接口**: `GET /api/membership/status`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "membership_type": "vip",
        "is_vip_active": true,
        "vip_expires_at": "2025-01-20T10:45:00Z",
        "days_remaining": 31,
        "auto_renewal": false,
        "benefits": {
            "unlimited_learning": true,
            "unlimited_ai_questions": true,
            "unlimited_stories": true,
            "offline_download": true,
            "premium_content": true
        }
    }
}
```

## 📚 用户数据接口

### 1. 获取用户单词本
**接口**: `GET /api/user/words`  
**认证**: Bearer Token必需

**查询参数**:
- `page`: 页码，默认1
- `per_page`: 每页数量，默认20，最大100
- `category_id`: 分类ID，可选
- `is_learned`: 是否已学会，可选
- `search`: 搜索关键词，可选

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "words": [
            {
                "id": 1,
                "word_text": "technology",
                "translation": "技术",
                "phonetic": "/tekˈnɑːlədʒi/",
                "part_of_speech": "noun",
                "category_id": 1,
                "category_name": "计算机",
                "is_learned": true,
                "learned_at": "2024-12-15T14:30:00Z",
                "review_count": 3,
                "last_reviewed": "2024-12-18T09:15:00Z",
                "created_at": "2024-12-10T16:20:00Z"
            }
        ],
        "total": 45,
        "page": 1,
        "per_page": 20,
        "pages": 3,
        "statistics": {
            "total_words": 45,
            "learned_words": 28,
            "learning_rate": 62.2
        }
    }
}
```

### 2. 添加单词到单词本
**接口**: `POST /api/user/words`  
**认证**: Bearer Token必需

**请求参数**:
```json
{
    "word_text": "artificial",
    "translation": "人工的",      // 可选，自动获取
    "category_id": 1             // 可选
}
```

**成功响应** (201):
```json
{
    "success": true,
    "message": "单词添加成功",
    "data": {
        "id": 46,
        "word_text": "artificial",
        "translation": "人工的，人造的",
        "phonetic": "/ˌɑːrtɪˈfɪʃl/",
        "part_of_speech": "adjective",
        "category_id": 1
    }
}
```

**错误响应**:
```json
// 409 - 单词已存在
{
    "success": false,
    "error": "word_exists",
    "message": "该单词已在您的单词本中"
}

// 429 - 超出限制
{
    "success": false,
    "error": "quota_exceeded",
    "message": "免费用户最多添加200个单词，请升级VIP"
}
```

### 3. 更新单词学习状态
**接口**: `PUT /api/user/words/{word_id}/status`  
**认证**: Bearer Token必需

**请求参数**:
```json
{
    "is_learned": true
}
```

**成功响应** (200):
```json
{
    "success": true,
    "message": "学习状态更新成功",
    "data": {
        "word_id": 46,
        "is_learned": true,
        "learned_at": "2024-12-20T10:30:00Z"
    }
}
```

### 4. 删除单词
**接口**: `DELETE /api/user/words/{word_id}`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "message": "单词删除成功"
}
```

### 5. 获取学习统计
**接口**: `GET /api/user/statistics`  
**认证**: Bearer Token必需

**查询参数**:
- `period`: 统计周期，`week/month/year`，默认`week`

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "period": "week",
        "date_range": {
            "start": "2024-12-14",
            "end": "2024-12-20"
        },
        "learning_stats": {
            "total_sessions": 12,
            "total_study_time": 3600,
            "words_learned": 25,
            "stories_read": 8,
            "questions_answered": 45,
            "accuracy_rate": 85.5
        },
        "daily_breakdown": [
            {
                "date": "2024-12-20",
                "sessions": 3,
                "study_time": 900,
                "words_learned": 8
            }
        ],
        "word_categories": [
            {
                "category_name": "计算机",
                "word_count": 15,
                "learned_count": 12
            }
        ]
    }
}
```

## 🎥 学习功能接口扩展

### 1. 创建个人学习会话
**接口**: `POST /api/user/learning/videos/{video_id}/session`  
**认证**: Bearer Token必需

**请求参数**:
```json
{
    "show_chinese": true,
    "show_english": true,
    "difficulty_level": "intermediate"  // beginner/intermediate/advanced
}
```

**成功响应** (201):
```json
{
    "success": true,
    "message": "学习会话创建成功",
    "data": {
        "session_id": "SESSION_550e8400-e29b-41d4-a716-446655440000",
        "video_id": "VIDEO_550e8400-e29b-41d4-a716-446655440000",
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "config": {
            "show_chinese": true,
            "show_english": true,
            "difficulty_level": "intermediate"
        },
        "quota_used": {
            "daily_sessions": {"used": 4, "limit": 5, "remaining": 1}
        }
    }
}
```

**错误响应**:
```json
// 429 - 超出配额
{
    "success": false,
    "error": "quota_exceeded",
    "message": "今日学习会话次数已达上限 (5次)。升级VIP可享无限次学习。",
    "data": {
        "quota_info": {
            "daily_sessions": {"used": 5, "limit": 5, "remaining": 0},
            "reset_time": "2024-12-21T00:00:00Z"
        },
        "upgrade_suggestion": {
            "plan_type": "vip",
            "benefits": ["无限学习会话", "专属学习内容"]
        }
    }
}
```

### 2. 获取个人学习历史
**接口**: `GET /api/user/learning/sessions?page=1&per_page=10`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "sessions": [
            {
                "session_id": "SESSION_550e8400-e29b-41d4-a716-446655440000",
                "video_title": "English Learning Basics",
                "duration": 1200,
                "status": "completed",
                "progress": 100,
                "words_learned": 15,
                "questions_answered": 8,
                "accuracy": 87.5,
                "created_at": "2024-12-20T09:30:00Z",
                "completed_at": "2024-12-20T10:00:00Z"
            }
        ],
        "total": 25,
        "page": 1,
        "per_page": 10
    }
}
```

## 🎯 配额管理接口

### 1. 检查用户配额
**接口**: `GET /api/user/quota/check`  
**认证**: Bearer Token必需

**成功响应** (200):
```json
{
    "success": true,
    "data": {
        "user_type": "free",  // free/vip
        "quotas": {
            "learning_sessions": {
                "limit": 5,
                "used": 3,
                "remaining": 2,
                "reset_time": "2024-12-21T00:00:00Z"
            },
            "ai_questions": {
                "limit": 10,
                "used": 7,
                "remaining": 3,
                "reset_time": "2024-12-21T00:00:00Z"
            },
            "story_generations": {
                "limit": 3,
                "used": 3,
                "remaining": 0,
                "reset_time": "2024-12-21T00:00:00Z"
            },
            "personal_words": {
                "limit": 200,
                "used": 45,
                "remaining": 155,
                "reset_time": null
            }
        },
        "vip_benefits": {
            "available": false,
            "benefits": [
                "无限学习会话",
                "无限AI问题生成",
                "无限故事生成",
                "个人单词本无限制"
            ]
        }
    }
}
```

### 2. 配额使用记录
**接口**: `POST /api/user/quota/use`  
**认证**: Bearer Token必需  
**说明**: 内部接口，由其他服务调用

**请求参数**:
```json
{
    "quota_type": "learning_sessions",  // learning_sessions/ai_questions/story_generations
    "amount": 1
}
```

## 🚨 错误处理

### 通用错误码
| 状态码 | 错误类型 | 处理建议 |
|--------|----------|----------|
| 400 | 请求参数错误 | 检查请求参数格式 |
| 401 | 未授权 | 重新登录获取token |
| 403 | 权限不足 | 检查用户权限或升级VIP |
| 404 | 资源不存在 | 检查资源ID是否正确 |
| 409 | 资源冲突 | 处理重复数据或冲突状态 |
| 429 | 配额超限 | 提示用户升级或等待重置 |
| 500 | 服务器错误 | 稍后重试或联系技术支持 |

### 配额超限错误处理
```json
{
    "success": false,
    "error": "quota_exceeded",
    "message": "今日学习会话已达上限",
    "data": {
        "quota_type": "learning_sessions",
        "current_usage": {"used": 5, "limit": 5},
        "reset_time": "2024-12-21T00:00:00Z",
        "upgrade_options": [
            {
                "plan_type": "monthly",
                "name": "VIP月卡", 
                "price": 19.90,
                "benefits": ["无限学习会话"]
            }
        ]
    }
}
```

## 🔧 前端集成指南

### 1. 认证状态管理
```javascript
class AuthService {
    constructor() {
        this.token = localStorage.getItem('access_token');
        this.setupInterceptors();
    }
    
    setupInterceptors() {
        // 请求拦截器 - 添加token
        axios.interceptors.request.use(config => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });
        
        // 响应拦截器 - 处理错误
        axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    this.logout();
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );
    }
    
    async sendCode(phone) {
        return axios.post('/api/auth/send-code', { phone });
    }

    async login(phone, verificationCode) {
        try {
            const response = await axios.post('/api/auth/login', {
                phone,
                verification_code: verificationCode
            });
            this.token = response.data.data.access_token;
            localStorage.setItem('access_token', this.token);
            return response.data.data;
        } catch (error) {
            throw error.response?.data || error;
        }
    }
    
    logout() {
        this.token = null;
        localStorage.removeItem('access_token');
    }
}
```

### 2. 配额提示组件
```javascript
const QuotaAlert = ({ quotaInfo, onUpgrade }) => {
    const { used, limit, remaining } = quotaInfo;
    const percentage = (used / limit) * 100;
    
    if (remaining === 0) {
        return (
            <div className="quota-alert quota-alert--danger">
                <span>今日配额已用完</span>
                <button onClick={onUpgrade} className="btn-upgrade">
                    升级VIP
                </button>
            </div>
        );
    }
    
    if (percentage > 80) {
        return (
            <div className="quota-alert quota-alert--warning">
                <span>今日配额还剩 {remaining} 次</span>
            </div>
        );
    }
    
    return null;
};
```

### 3. 支付流程处理
```javascript
class PaymentService {
    async createOrder(planId) {
        const response = await axios.post('/api/membership/orders', {
            plan_id: planId
        });
        return response.data.data;
    }
    
    async initiatePayment(orderNo, paymentMethod) {
        const response = await axios.post('/api/membership/payments', {
            order_no: orderNo,
            payment_method: paymentMethod
        });
        return response.data.data;
    }
    
    async pollPaymentStatus(orderNo, onSuccess, onFailed) {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get(
                    `/api/membership/payments/${orderNo}/status`
                );
                
                const status = response.data.data.status;
                
                if (status === 'success') {
                    clearInterval(interval);
                    onSuccess(response.data.data);
                } else if (status === 'failed') {
                    clearInterval(interval);
                    onFailed('支付失败');
                }
            } catch (error) {
                clearInterval(interval);
                onFailed('查询支付状态失败');
            }
        }, 3000);
        
        // 5分钟后停止轮询
        setTimeout(() => clearInterval(interval), 300000);
        
        return interval;
    }
    
    async handlePayment(planId, paymentMethod) {
        try {
            // 1. 创建订单
            const order = await this.createOrder(planId);
            
            // 2. 发起支付
            const payment = await this.initiatePayment(order.order_no, paymentMethod);
            
            // 3. 处理支付方式
            if (paymentMethod === 'alipay') {
                window.open(payment.payment_url, '_blank');
            } else if (paymentMethod === 'wechat') {
                this.showQRCode(payment.qr_code);
            }
            
            // 4. 轮询支付状态
            return this.pollPaymentStatus(
                order.order_no,
                (result) => {
                    console.log('支付成功', result);
                    // 刷新用户信息
                    window.location.reload();
                },
                (error) => {
                    console.error('支付失败', error);
                }
            );
            
        } catch (error) {
            throw error.response?.data || error;
        }
    }
    
    showQRCode(qrCodeData) {
        // 显示微信支付二维码的逻辑
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div class="payment-modal">
                <h3>微信支付</h3>
                <img src="${qrCodeData}" alt="微信支付二维码" />
                <p>请使用微信扫码支付</p>
            </div>
        `;
        document.body.appendChild(modal);
    }
}
```

### 4. 用户单词本管理
```javascript
class WordService {
    async getUserWords(page = 1, perPage = 20, filters = {}) {
        const params = new URLSearchParams({
            page,
            per_page: perPage,
            ...filters
        });
        
        const response = await axios.get(`/api/user/words?${params}`);
        return response.data.data;
    }
    
    async addWord(wordText, translation, categoryId) {
        try {
            const response = await axios.post('/api/user/words', {
                word_text: wordText,
                translation,
                category_id: categoryId
            });
            return response.data.data;
        } catch (error) {
            if (error.response?.status === 429) {
                throw new Error('配额已满，请升级VIP或删除部分单词');
            }
            throw error.response?.data || error;
        }
    }
    
    async updateWordStatus(wordId, isLearned) {
        const response = await axios.put(`/api/user/words/${wordId}/status`, {
            is_learned: isLearned
        });
        return response.data;
    }
    
    async deleteWord(wordId) {
        const response = await axios.delete(`/api/user/words/${wordId}`);
        return response.data;
    }
}
```

## 📊 使用示例

### 完整用户流程示例
```javascript
// 1. 用户注册并登录
const authService = new AuthService();
await authService.sendCode('13800138000');
const user = await authService.login('13800138000', '123456');

// 2. 检查配额状态
const quotaResponse = await axios.get('/api/user/quota/check');
const quotas = quotaResponse.data.data.quotas;

// 3. 创建学习会话
if (quotas.learning_sessions.remaining > 0) {
    const sessionResponse = await axios.post('/api/user/learning/videos/video_id/session', {
        show_chinese: true,
        show_english: true,
        difficulty_level: 'intermediate'
    });
    console.log('学习会话创建成功:', sessionResponse.data);
} else {
    // 提示升级VIP
    console.log('配额不足，需要升级VIP');
}

// 4. 购买VIP会员
const paymentService = new PaymentService();
await paymentService.handlePayment(1, 'alipay'); // 购买月卡，支付宝支付

// 5. 添加单词到个人词库
const wordService = new WordService();
await wordService.addWord('technology', '技术', 1);
```

---

**API文档版本**: v3.0.0  
**最后更新**: 2024-12-20  
**维护团队**: 后端开发团队  
**联系方式**: dev@yourdomain.com 