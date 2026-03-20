package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
)

// blockedCIDRs contains private/link-local/loopback ranges to prevent SSRF.
var blockedCIDRs = []string{
	"127.0.0.0/8",
	"10.0.0.0/8",
	"172.16.0.0/12",
	"192.168.0.0/16",
	"169.254.0.0/16",
	"0.0.0.0/8",
	"::1/128",
	"fc00::/7",
	"fe80::/10",
}

type CpanelConfig struct {
	Host       string
	Username   string
	Token      string
	Port       int
	WHMPort    int
	WHMUsername string
	VerifySSL  bool
	Timeout    int
}

// validateHostname checks that the host is a valid hostname or IP address.
// Rejects empty strings, strings with whitespace, path/query components,
// embedded credentials, localhost, private/link-local IPs, and cloud
// metadata endpoints to prevent SSRF attacks.
func validateHostname(host string) error {
	if host == "" {
		return fmt.Errorf("CPANEL_HOST is required")
	}
	if strings.ContainsAny(host, " \t\n\r/\\?#@") {
		return fmt.Errorf("CPANEL_HOST contains invalid characters (whitespace, path, query, or credentials)")
	}

	lower := strings.ToLower(host)

	// Block localhost and loopback
	if lower == "localhost" || lower == "[::1]" || lower == "0.0.0.0" {
		return fmt.Errorf("CPANEL_HOST must not point to localhost or loopback addresses")
	}

	// Block cloud metadata endpoints (AWS, GCP, Azure)
	if lower == "169.254.169.254" || lower == "metadata.google.internal" || strings.HasSuffix(lower, ".internal") {
		return fmt.Errorf("CPANEL_HOST must not point to cloud metadata endpoints")
	}

	// If it's an IP, check against blocked CIDR ranges
	if ip := net.ParseIP(host); ip != nil {
		for _, cidr := range blockedCIDRs {
			_, network, err := net.ParseCIDR(cidr)
			if err != nil {
				continue
			}
			if network.Contains(ip) {
				return fmt.Errorf("CPANEL_HOST must not point to private, loopback, or link-local IP ranges")
			}
		}
		return nil
	}

	// Basic hostname validation: no consecutive dots, no leading/trailing dots
	if strings.HasPrefix(host, ".") || strings.HasSuffix(host, ".") || strings.Contains(host, "..") {
		return fmt.Errorf("CPANEL_HOST has invalid hostname format")
	}
	return nil
}

// validateNonEmpty checks that a credential value is non-empty and has no null bytes.
func validateNonEmpty(name, value string) error {
	if value == "" {
		return fmt.Errorf("%s environment variable is required", name)
	}
	if strings.ContainsRune(value, 0) {
		return fmt.Errorf("%s must not contain null bytes", name)
	}
	return nil
}

func Load() (*CpanelConfig, error) {
	host := os.Getenv("CPANEL_HOST")
	if err := validateNonEmpty("CPANEL_HOST", host); err != nil {
		return nil, err
	}
	if err := validateHostname(host); err != nil {
		return nil, err
	}

	username := os.Getenv("CPANEL_USERNAME")
	if err := validateNonEmpty("CPANEL_USERNAME", username); err != nil {
		return nil, err
	}

	token := os.Getenv("CPANEL_API_TOKEN")
	if err := validateNonEmpty("CPANEL_API_TOKEN", token); err != nil {
		return nil, err
	}

	port := 2083
	if p := os.Getenv("CPANEL_PORT"); p != "" {
		var err error
		port, err = strconv.Atoi(p)
		if err != nil || port < 1 || port > 65535 {
			return nil, fmt.Errorf("CPANEL_PORT must be a valid port number (1-65535)")
		}
	}
	whmPort := 2087
	if p := os.Getenv("CPANEL_WHM_PORT"); p != "" {
		var err error
		whmPort, err = strconv.Atoi(p)
		if err != nil || whmPort < 1 || whmPort > 65535 {
			return nil, fmt.Errorf("CPANEL_WHM_PORT must be a valid port number (1-65535)")
		}
	}
	whmUser := os.Getenv("CPANEL_WHM_USERNAME")
	if whmUser == "" {
		whmUser = "root"
	}
	verifySsl := os.Getenv("CPANEL_VERIFY_SSL") == "true"
	timeout := 30
	if t := os.Getenv("CPANEL_TIMEOUT"); t != "" {
		var err error
		timeout, err = strconv.Atoi(t)
		if err != nil || timeout < 1 || timeout > 300 {
			return nil, fmt.Errorf("CPANEL_TIMEOUT must be between 1 and 300 seconds")
		}
	}

	return &CpanelConfig{
		Host:       host,
		Username:   username,
		Token:      token,
		Port:       port,
		WHMPort:    whmPort,
		WHMUsername: whmUser,
		VerifySSL:  verifySsl,
		Timeout:    timeout,
	}, nil
}
