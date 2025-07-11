<template>
  <div class="basic-vocabulary">
    <!-- 功能面板 -->
    <el-row :gutter="20" class="function-section">
      <el-col :xs="24" :md="8">
        <el-card class="function-card">
          <template #header>
            <span>词汇搜索</span>
          </template>
          <div class="search-section">
            <el-input
              v-model="searchQuery"
              placeholder="输入要搜索的单词"
              @keyup.enter="searchWords"
              clearable
            >
              <template #append>
                <el-button 
                  type="primary" 
                  @click="searchWords"
                  :loading="searching"
                >
                  搜索
                </el-button>
              </template>
            </el-input>
            
            <div class="search-options">
              <el-input-number
                v-model="searchLimit"
                :min="1"
                :max="100"
                size="small"
                controls-position="right"
              />
              <span class="option-label">搜索结果数量</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :md="8">
        <el-card class="function-card">
          <template #header>
            <span>按难度获取</span>
          </template>
          <div class="difficulty-section">
            <div class="difficulty-options">
              <el-select v-model="selectedDifficulty" placeholder="选择难度" size="small" style="width: 100%;">
                <el-option label="初级 (1级)" value="1"></el-option>
                <el-option label="中级 (2级)" value="2"></el-option>
                <el-option label="高级 (3级)" value="3"></el-option>
              </el-select>
              
              <div class="difficulty-controls">
                <el-input-number
                  v-model="difficultyLimit"
                  :min="1"
                  :max="500"
                  size="small"
                  controls-position="right"
                  style="width: 120px;"
                />
                
                <el-button 
                  type="warning" 
                  @click="getWordsByDifficulty"
                  :loading="loadingDifficulty"
                  size="small"
                >
                  获取词汇
                </el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :md="8">
        <el-card class="function-card">
          <template #header>
            <span>随机词汇</span>
          </template>
          <div class="random-section">
            <div class="random-options">
              <el-select v-model="randomDifficulty" placeholder="选择难度" clearable size="small">
                <el-option label="初级" value="1"></el-option>
                <el-option label="中级" value="2"></el-option>
                <el-option label="高级" value="3"></el-option>
              </el-select>
              
              <el-input-number
                v-model="randomCount"
                :min="1"
                :max="50"
                size="small"
                controls-position="right"
              />
              
              <el-button 
                type="success" 
                @click="getRandomWords"
                :loading="loadingRandom"
                size="small"
              >
                获取随机词汇
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 结果展示区域 -->
    <el-row v-if="words.length > 0">
      <el-col :span="24">
        <el-card class="results-card">
          <template #header>
            <span>词汇列表 (共 {{ words.length }} 个)</span>
            <el-button 
              type="text" 
              @click="clearResults"
              style="float: right; padding: 3px 0"
            >
              清空
            </el-button>
          </template>
          
          <div class="word-grid">
            <el-card 
              v-for="word in words" 
              :key="word.id || word.word"
              class="word-item"
              shadow="hover"
            >
              <div class="word-content">
                <h3 class="word-text">{{ word.word }}</h3>
                <p class="word-meaning">{{ word.translation }}</p>
                <p class="word-phonetic" v-if="word.phonetic">{{ word.phonetic }}</p>
                <div class="word-meta">
                  <el-tag 
                    :type="getDifficultyType(word.difficulty_level)"
                    size="small"
                  >
                    {{ getDifficultyLabel(word.difficulty_level) }}
                  </el-tag>
                  <el-tag 
                    v-if="word.part_of_speech"
                    type="info" 
                    size="small"
                    style="margin-left: 5px;"
                  >
                    {{ word.part_of_speech }}
                  </el-tag>
                </div>
                <p class="word-example" v-if="word.example_sentence">
                  {{ word.example_sentence }}
                </p>
              </div>
            </el-card>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 空状态 -->
    <el-empty 
      v-if="showEmpty" 
      description="暂无词汇数据"
      :image-size="100"
    />
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'BasicVocabulary',
  data() {
    return {
      searchQuery: '',
      searchLimit: 10,
      searching: false,
      selectedDifficulty: '',
      difficultyLimit: 20,
      loadingDifficulty: false,
      randomDifficulty: '',
      randomCount: 10,
      loadingRandom: false,
      words: [],
      showEmpty: false,
      baseURL: 'http://localhost:5000/api/base-words'
    }
  },
  methods: {
    async searchWords() {
      if (!this.searchQuery.trim()) {
        this.$message.warning('请输入要搜索的单词')
        return
      }

      this.searching = true
      try {
        const response = await axios.get(`${this.baseURL}/search`, {
          params: {
            query: this.searchQuery,
            limit: this.searchLimit
          }
        })
        
        if (response.data.success) {
          this.words = response.data.results || []
          this.showEmpty = this.words.length === 0
          
          if (this.words.length > 0) {
            this.$message.success(`找到 ${response.data.total} 个相关词汇`)
          } else {
            this.$message.info('未找到相关词汇')
          }
        } else {
          throw new Error(response.data.error || '搜索失败')
        }
      } catch (error) {
        console.error('搜索失败:', error)
        this.$message.error(error.response?.data?.error || '搜索失败，请重试')
      } finally {
        this.searching = false
      }
    },

    async getWordsByDifficulty() {
      if (!this.selectedDifficulty) {
        this.$message.warning('请选择难度等级')
        return
      }

      this.loadingDifficulty = true
      try {
        const response = await axios.get(`${this.baseURL}/difficulty/${this.selectedDifficulty}`, {
          params: {
            limit: this.difficultyLimit
          }
        })
        
        if (response.data.success) {
          this.words = response.data.words || []
          this.showEmpty = this.words.length === 0
          
          if (this.words.length > 0) {
            this.$message.success(`获取到 ${response.data.count} 个${this.getDifficultyLabel(this.selectedDifficulty)}词汇`)
          } else {
            this.$message.info('该难度暂无词汇')
          }
        } else {
          throw new Error(response.data.error || '获取词汇失败')
        }
      } catch (error) {
        console.error('获取词汇失败:', error)
        this.$message.error(error.response?.data?.error || '获取词汇失败，请重试')
      } finally {
        this.loadingDifficulty = false
      }
    },

    async getRandomWords() {
      this.loadingRandom = true
      try {
        const params = {
          count: this.randomCount  // 注意：文档中是 count，不是 limit
        }
        
        if (this.randomDifficulty) {
          params.difficulty = this.randomDifficulty
        }

        const response = await axios.get(`${this.baseURL}/random`, { params })
        
        if (response.data.success) {
          this.words = response.data.words || []
          this.showEmpty = this.words.length === 0
          
          if (this.words.length > 0) {
            this.$message.success(`获取到 ${response.data.count} 个随机词汇`)
          } else {
            this.$message.info('暂无可用词汇')
          }
        } else {
          throw new Error(response.data.error || '获取随机词汇失败')
        }
      } catch (error) {
        console.error('获取随机词汇失败:', error)
        this.$message.error(error.response?.data?.error || '获取随机词汇失败，请重试')
      } finally {
        this.loadingRandom = false
      }
    },

    clearResults() {
      this.words = []
      this.showEmpty = false
    },

    getDifficultyType(difficulty) {
      const diffStr = String(difficulty)
      const types = { '1': 'success', '2': 'warning', '3': 'danger' }
      return types[diffStr] || 'info'
    },

    getDifficultyLabel(difficulty) {
      const diffStr = String(difficulty)
      const labels = { '1': '初级', '2': '中级', '3': '高级' }
      return labels[diffStr] || '未知'
    }
  }
}
</script>

<style scoped>
.basic-vocabulary {
  padding: 20px;
}

.function-section {
  margin-bottom: 20px;
}

.function-card {
  margin-bottom: 20px;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search-options {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-label {
  font-size: 12px;
  color: #666;
}

.difficulty-section,
.random-section {
  padding: 10px 0;
}

.difficulty-options,
.random-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.difficulty-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.random-options {
  align-items: stretch;
}

.random-options > * {
  margin-bottom: 10px;
}

.random-options > *:last-child {
  margin-bottom: 0;
}

.results-card {
  margin-top: 20px;
}

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.word-item {
  transition: transform 0.2s;
}

.word-item:hover {
  transform: translateY(-2px);
}

.word-content {
  text-align: center;
}

.word-text {
  margin: 0 0 8px 0;
  color: #409eff;
  font-size: 20px;
  font-weight: bold;
}

.word-meaning {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
}

.word-phonetic {
  margin: 0 0 10px 0;
  color: #666;
  font-size: 14px;
  font-style: italic;
}

.word-meta {
  margin: 10px 0;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px;
}

.word-example {
  margin: 10px 0 0 0;
  color: #777;
  font-size: 12px;
  font-style: italic;
  line-height: 1.4;
}
</style> 