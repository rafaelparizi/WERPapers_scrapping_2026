# Estágio 1: gera dashboard/site/data.json a partir da planilha normalizada
FROM python:3.12-slim AS build
WORKDIR /app
RUN pip install --no-cache-dir pandas openpyxl
COPY data/wer_papers_normalized.xlsx data/
COPY dashboard/ dashboard/
RUN python dashboard/build_data.py

# Estágio 2: serve o site estático
FROM nginx:alpine
COPY --from=build /app/dashboard/site/ /usr/share/nginx/html/
EXPOSE 80
