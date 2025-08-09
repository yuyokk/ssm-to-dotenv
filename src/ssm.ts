import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function getSsmParams(ssmPaths: string[]) {
  console.log("getSsmParams() req", JSON.stringify(ssmPaths));

  const result = await ssmClient.send(
    new GetParametersCommand({
      Names: ssmPaths,
      WithDecryption: true,
    })
  );

  return result.Parameters;
}
