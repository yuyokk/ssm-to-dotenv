# @yuyokk/ssm-to-dotenv

Fetches environment variables from AWS SSM Parameter Store and writes them to a `.env` file.

## Usage

```sh
npx @yuyokk/ssm-to-dotenv --input=.env.example --output=.env.fetched
```

- `--input` (optional): Path to the input template file (default: `.env.example`)
- `--output` (optional): Path to the output file (default: `.env.fetched`)

## AWS Credentials

Make sure your AWS credentials and region are set in your environment, e.g.:

```sh
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

## Example

Suppose your `.env.example` contains:

```
# Database credentials
DB_USER=ssm:/my-app/db-user
DB_PASS=ssm:/my-app/db-pass
API_KEY=some-api-key
```

After running the script, `.env.fetched` will contain:

```
# Database credentials
DB_USER=actual-db-user-from-ssm
DB_PASS=actual-db-pass-from-ssm
API_KEY=some-api-key
```
