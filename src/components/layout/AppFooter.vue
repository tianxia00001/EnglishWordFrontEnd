<template>
  <div class="footer-container">
    <p>© {{ currentYear }} 英语学习助手 - 提升您的英语学习效率</p>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'AppFooter',
  setup() {
    const currentYear = ref(new Date().getFullYear())
    
    return {
      currentYear
    }
  }
}
</script>

<style scoped>
.footer-container {
  text-align: center;
  padding: 20px 0;
  background-color: #545c64;
  color: #fff;
}
</style>
