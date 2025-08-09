# @yuyokk/ssm-to-dotenv

Fetches environment variables from AWS SSM Parameter Store and writes them to a `.env` file.

## Features

- Reads environment variable definitions from a template file (e.g., `.env.example`)
- Fetches SSM parameters for variables defined as `ssm:/path/to/param`
- Writes a `.env` file with resolved values
- Supports comments and regular values in the template

## Installation

```sh
npm install
```

## Usage

```sh
npx tsx src/main.ts --input=.env.example --output=.env.fetched
```

- `--input` (optional): Path to the input template file (default: `.env.example`)
- `--output` (optional): Path to the output file (default: `.env.fetched`)

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

## AWS Credentials

Make sure your AWS credentials and region are set in your environment, e.g.:

```sh
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

## Testing

```sh
npm test
```
