# PocketBase — minimal image that downloads official binary
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
ENV PB_VERSION=0.22.22
RUN wget -q "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -O /tmp/pb.zip \
  && unzip /tmp/pb.zip -d /usr/local/bin \
  && rm /tmp/pb.zip \
  && chmod +x /usr/local/bin/pocketbase
EXPOSE 8090
ENTRYPOINT ["/usr/local/bin/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data"]
