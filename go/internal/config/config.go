package config

import (
	"fmt"
	"os"
	"strconv"
)

type CpanelConfig struct {
	Host        string
	Username    string
	Token       string
	Port        int
	WHMPort     int
	WHMUsername  string
	VerifySSL   bool
	Timeout     int
}

func Load() (*CpanelConfig, error) {
	host := os.Getenv("CPANEL_HOST")
	if host == "" {
		return nil, fmt.Errorf("CPANEL_HOST environment variable is required")
	}
	username := os.Getenv("CPANEL_USERNAME")
	if username == "" {
		return nil, fmt.Errorf("CPANEL_USERNAME environment variable is required")
	}
	token := os.Getenv("CPANEL_API_TOKEN")
	if token == "" {
		return nil, fmt.Errorf("CPANEL_API_TOKEN environment variable is required")
	}

	port := 2083
	if p := os.Getenv("CPANEL_PORT"); p != "" {
		port, _ = strconv.Atoi(p)
	}
	whmPort := 2087
	if p := os.Getenv("CPANEL_WHM_PORT"); p != "" {
		whmPort, _ = strconv.Atoi(p)
	}
	whmUser := os.Getenv("CPANEL_WHM_USERNAME")
	if whmUser == "" {
		whmUser = "root"
	}
	verifySsl := os.Getenv("CPANEL_VERIFY_SSL") == "true"
	timeout := 30
	if t := os.Getenv("CPANEL_TIMEOUT"); t != "" {
		timeout, _ = strconv.Atoi(t)
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
