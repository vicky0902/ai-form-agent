FROM node:20-alpine
WORKDIR /app
# 依赖随代码包一起分发（纯 JS），规避远端构建机 npm install 不稳定的问题
COPY node_modules ./node_modules
COPY index.js ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.js"]
