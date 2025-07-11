import CryptoJS from 'crypto-js'

/**
 * 文件哈希计算工具
 */
class FileHashCalculator {
  /**
   * 计算文件的SHA-256哈希值（兼容后端）
   * @param {File} file - 要计算哈希的文件
   * @returns {Promise<string>} - 十六进制哈希字符串
   */
  async calculateSHA256(file) {
    try {
      // 优先使用crypto.subtle（如果可用）
      if (this.isCryptoSubtleAvailable()) {
        console.log('使用 crypto.subtle 计算SHA-256')
        return this.calculateWithCryptoSubtle(file)
      }
      
      // 降级到crypto-js
      console.log('使用 crypto-js 计算SHA-256')
      return this.calculateWithCryptoJS(file)
      
    } catch (error) {
      console.error('SHA-256计算失败:', error)
      throw error
    }
  }

  /**
   * 使用crypto.subtle计算（原始方法）
   */
  async calculateWithCryptoSubtle(file) {
    const buffer = await this.fileToArrayBuffer(file)
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * 使用crypto-js计算（降级方案）
   */
  async calculateWithCryptoJS(file) {
    const buffer = await this.fileToArrayBuffer(file)
    const wordArray = CryptoJS.lib.WordArray.create(buffer)
    const hash = CryptoJS.SHA256(wordArray)
    return hash.toString(CryptoJS.enc.Hex)
  }

  /**
   * 检查crypto.subtle是否可用
   */
  isCryptoSubtleAvailable() {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.subtle.digest === 'function'
  }

  /**
   * 将文件转换为ArrayBuffer
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 获取视频元数据
   */
  async getVideoMetadata(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      
      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          size: file.size,
          type: file.type,
          name: file.name,
          lastModified: file.lastModified
        }
        URL.revokeObjectURL(video.src)
        resolve(metadata)
      }
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error('无法读取视频元数据'))
      }
      
      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * 生成文件指纹
   */
  async generateFingerprint(file) {
    try {
      const [hash, metadata] = await Promise.all([
        this.calculateSHA256(file),
        this.getVideoMetadata(file)
      ])

      return {
        hash,
        metadata,
        fingerprint: `${hash}_${metadata.size}_${Math.floor(metadata.duration || 0)}`,
        hashMethod: this.isCryptoSubtleAvailable() ? 'crypto.subtle' : 'crypto-js'
      }
    } catch (error) {
      console.error('生成文件指纹失败:', error)
      throw error
    }
  }
}

export const fileHashCalculator = new FileHashCalculator()
export default fileHashCalculator