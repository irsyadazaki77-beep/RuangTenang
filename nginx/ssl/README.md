# Directory for initial SSL / TLS certificates
# Generate a self-signed development/staging certificate if Let's Encrypt is not yet active:
# openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -subj "/CN=localhost"
