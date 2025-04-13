
# SSH Key Verification Guide

## Troubleshooting "Host key verification failed" Error

If you encounter a "Host key verification failed" error, follow these steps to resolve the SSH key authentication issue:

1. **Verify SSH Key Permissions**
   - Ensure that your SSH key has the necessary permissions to access the repository
   - Check that the key file permissions are set correctly (typically 600 for private key)

2. **SSH Agent Configuration**
   - Make sure the SSH key is correctly added to the SSH agent
   - Verify the key is loaded using `ssh-add -l`

3. **GitHub Account Setup**
   - Confirm the SSH public key is added to your GitHub account
   - Verify the key has appropriate repository access permissions

4. **Build Environment Setup**
   - If using CI/CD, ensure SSH keys are correctly configured in environment variables
   - For Netlify builds, check SSH key configuration in build settings

## Common Commands for SSH Key Setup

```bash
# Check SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/your_key

# Test SSH connection
ssh -T git@github.com

# Set correct permissions
chmod 600 ~/.ssh/your_key
chmod 644 ~/.ssh/your_key.pub
```

For additional SSH configuration help, refer to the GitHub documentation or contact your system administrator.
