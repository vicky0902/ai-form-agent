FROM node:20-alpine
WORKDIR /app
# express 已用 esbuild 打进单文件，无需 node_modules / npm install
COPY index.bundle.cjs ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "index.bundle.cjs"]
