# @yuyokk/ssm-to-dotenv

Fetches environment variables from AWS SSM Parameter Store and writes them to a `.env` file. Supports comments and non-SSM variables. SSM variables are resolved using the AWS SDK and written to the output file.

## Usage

```sh
npx @yuyokk/ssm-to-dotenv --input=.env.example --output=.env.local
```

- `--input` (optional): Path to the input template file (default: `.env.example`)
- `--output` (optional): Path to the output file (default: `.env.local`)

The script reads the input file, fetches SSM parameters for any value starting with `ssm:`, and writes the result to the output file. Comments and non-SSM variables are preserved.

## Example

Suppose your `.env.example` contains:

```ini
# Database credentials
DB_USER=ssm:/my-app/db-user
DB_PASS=ssm:/my-app/db-pass
API_KEY=some-api-key
SOME_OTHER_VAR=ssm:/my-app/other-var
```

After running the script, `.env.local` will contain:

```ini
# Created at 2025-08-09T12:34:56.789Z
# ---
# Database credentials
DB_USER=actual-db-user-from-ssm
DB_PASS=actual-db-pass-from-ssm
API_KEY=some-api-key
SOME_OTHER_VAR= # ssm:/my-app/other-var not found
```

- The output always starts with a timestamp and separator.
- Comments and non-SSM variables are copied as-is.
- If an SSM parameter is not found, the variable is set to an empty value with a comment.

## AWS Credentials

Make sure your AWS credentials and region are set in your environment, e.g.:

```sh
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

The AWS region defaults to `us-east-1` if not set. You can use any method supported by the AWS SDK to provide credentials (env vars, config files, etc).
