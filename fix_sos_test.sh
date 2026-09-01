sed -i 's/expect(sosButton).toBeDisabled();/await waitFor(() => expect(sosButton).toBeDisabled());/g' src/__tests__/integration/integrationWorkflows.test.tsx
