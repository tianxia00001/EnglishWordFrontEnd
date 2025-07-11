<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <app-header />
      </el-header>
      <el-main>
        <router-view />
      </el-main>
      <el-footer>
        <app-footer />
      </el-footer>
    </el-container>
  </div>
</template>

<script>
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'

export default {
  name: 'App',
  components: {
    AppHeader,
    AppFooter
  }
}
</script>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
}

.app-container {
  min-height: 100vh;
}

.el-header {
  padding: 0;
  height: auto !important;
}

.el-footer {
  padding: 0;
  height: auto !important;
}

.el-main {
  padding: 20px;
  background-color: #f5f7fa;
}
</style>
