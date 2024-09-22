import axios from "axios";

export const errorHandler = <Error, Response>(
  error: Error,
  response: Response
) => {
  if (axios.isAxiosError(error)) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  return response;
};
