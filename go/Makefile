.PHONY: build test clean install

build:
	@mkdir -p bin
	go build -o bin/cpanel-mcp ./cmd/cpanel-mcp

test:
	go test ./...

clean:
	rm -rf bin

install:
	go install ./cmd/cpanel-mcp
