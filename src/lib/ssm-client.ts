import {
  SSMClient,
  GetParametersCommand,
  type Parameter,
} from "@aws-sdk/client-ssm";

const client = new SSMClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// TODO: add tests
export async function getParams(paths: string[]) {
  const limitParamsPerFetch = 10;
  const results: Parameter[] = [];

  for (let i = 0; i < paths.length; i += limitParamsPerFetch) {
    const pathsChunk = paths.slice(i, i + limitParamsPerFetch);

    console.log(
      "[ssm-to-dotenv] aws.GetParametersCommand()",
      JSON.stringify(pathsChunk)
    );
    const { Parameters } = await client.send(
      new GetParametersCommand({
        Names: pathsChunk,
        WithDecryption: true,
      })
    );

    if (Parameters) {
      results.push(...Parameters);
    }
  }

  return results;
}
