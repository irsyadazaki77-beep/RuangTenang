sed -i 's/expect(screen.getByText(\/bukan diagnosis medis\/i)).toBeInTheDocument();/expect(screen.getByText(\/bukan pengganti diagnosis medis\/i)).toBeInTheDocument();/g' src/__tests__/integration/integrationWorkflows.test.tsx
sed -i 's/Picu Sinyal SOS|Mengirim Sinyal SOS/Kirim Sinyal Darurat|Mengirim/g' src/__tests__/integration/integrationWorkflows.test.tsx
