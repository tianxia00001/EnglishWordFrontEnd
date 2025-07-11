/**
 * API调试工具
 * 用于测试和调试API连接问题
 */

import apiService from '@/services/api'

export class APIDebugger {
  constructor() {
    this.results = []
  }

  // 添加调试结果
  addResult(endpoint, method, status, data, error = null) {
    this.results.push({
      endpoint,
      method,
      status,
      data,
      error,
      timestamp: new Date().toISOString()
    })
  }

  // 测试会员相关API
  async testMembershipAPIs() {
    console.log('🔧 开始测试会员相关API...')
    
    const tests = [
      {
        name: '获取会员套餐',
        test: () => apiService.getMembershipPlans()
      },
      {
        name: '获取会员状态',
        test: () => apiService.getMembershipStatus()
      },
      {
        name: '获取订单历史',
        test: () => apiService.getOrderHistory(1, 10)
      }
    ]

    for (const { name, test } of tests) {
      try {
        console.log(`📡 测试: ${name}`)
        const result = await test()
        console.log(`✅ ${name} 成功:`, result)
        this.addResult(name, 'GET', 'success', result)
      } catch (error) {
        console.error(`❌ ${name} 失败:`, error)
        this.addResult(name, 'GET', 'error', null, {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        })
      }
    }

    return this.results
  }

  // 测试认证状态
  async testAuth() {
    const token = localStorage.getItem('access_token')
    const userInfo = localStorage.getItem('user_info')
    
    console.log('🔐 认证调试信息:')
    console.log('Token存在:', !!token)
    console.log('用户信息存在:', !!userInfo)
    
    if (token) {
      console.log('Token长度:', token.length)
      console.log('Token前缀:', token.substring(0, 20) + '...')
    }
    
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo)
        console.log('用户信息:', {
          phone: parsed.phone,
          nickname: parsed.nickname,
          isVip: parsed.is_vip
        })
      } catch (e) {
        console.error('用户信息解析失败:', e)
      }
    }
  }

  // 生成调试报告
  generateReport() {
    console.log('\n📊 API调试报告:')
    console.log('=' * 50)
    
    this.results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.endpoint}`)
      console.log(`   状态: ${result.status}`)
      console.log(`   时间: ${result.timestamp}`)
      
      if (result.status === 'success') {
        console.log(`   数据结构:`, Object.keys(result.data || {}))
      } else {
        console.log(`   错误: ${result.error?.message}`)
        console.log(`   HTTP状态: ${result.error?.status}`)
      }
    })
    
    return this.results
  }

  // 清空结果
  clear() {
    this.results = []
  }
}

// 创建全局调试器实例
export const apiDebugger = new APIDebugger()

// 添加到window对象，方便在浏览器控制台使用
if (typeof window !== 'undefined') {
  window.apiDebugger = apiDebugger
}

export default APIDebugger 