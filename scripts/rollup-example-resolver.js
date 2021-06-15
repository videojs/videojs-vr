module.exports = {
  name: 'example-resolver',
  resolveId(source) {
    if (source.startsWith('three/examples/js')) {
      return {
        id: require.resolve(source),
        external: false
      };
    }

    return null;
  },
}
