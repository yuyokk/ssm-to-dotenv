export type EnvVariable =
  | {
      type: "value";
      name: string;
      value: string | undefined;
    }
  | {
      type: "ssm";
      name: string;
      path: string;
      value: string | undefined;
    }
  | {
      type: "comment";
      value: string;
    }
  | {
      type: "other";
      value: string;
    };
