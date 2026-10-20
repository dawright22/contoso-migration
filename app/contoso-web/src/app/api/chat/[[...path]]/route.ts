function disabled() {
  return Response.json(
    { error: "Chat is disabled in this deployment." },
    { status: 404 }
  );
}

export {
  disabled as GET,
  disabled as POST,
  disabled as PUT,
  disabled as PATCH,
  disabled as DELETE,
  disabled as HEAD,
  disabled as OPTIONS,
};
