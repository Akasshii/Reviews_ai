# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git (needed for go mod download)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Final stage
FROM alpine:latest

WORKDIR /root/

# Install ca-certificates for HTTPS and chromium with dependencies for headless parsing
RUN apk --no-cache add \
    ca-certificates \
    chromium \
    nss \
    freetype \
    harfbuzz \
    font-noto \
    && rm -rf /var/cache/apk/*

# Chromium configuration for headless mode in container
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROMEDP_NO_SANDBOX=true
ENV CHROME_FLAGS="--no-sandbox --disable-gpu --disable-dev-shm-usage"

# Copy the binary from builder
COPY --from=builder /app/main .

# Expose port (Render uses PORT env var)
EXPOSE 10000

# Run the binary
CMD ["./main"]
