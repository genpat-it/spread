FROM nginx:alpine
LABEL maintainer="GENPAT <genomica@izs.it>"
COPY . /usr/share/nginx/html
ARG PORT=80
EXPOSE $PORT
RUN sed -i 's/listen\(.*\)80;/listen '"$PORT"';/' /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]