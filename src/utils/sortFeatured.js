const sortFeatured = (featured) => {
  if (!featured) {
    return undefined;
  }
  featured = featured[0].data.featured_group.reduce((acc, val) => {
    return [
      ...acc,
      {
        text: val.group_label[0].text,
        speakers: [
          val.speaker_1.id,
          val.speaker_2.id,
          val.speaker_3.id,
          val.speaker_4.id,
        ],
      },
    ];
  }, []);
  return featured;
};

export default sortFeatured;
