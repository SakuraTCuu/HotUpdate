# HotUpdate
    基于ccc2.3.1的热更新代码Demo与片段

# 热更新大致原理:
    * 生成整个项目的所有资源的md5,
    * 与服务端存放的项目资源的md5进行比较,
    * 下载差异资源,并设置缓存资源路径
  
# version_generator.js
    生成version和manifest文件,编译后手动生成
  [使用方法](https://github.com/cocos-creator/tutorial-hot-update)

# HotUpdate.ts
    热更新组件,包含简略逻辑
    
# 热更新管理器 AssetsManager
  [AssetsManager](https://docs.cocos.com/creator/manual/zh/advanced-topics/assets-manager.html)
