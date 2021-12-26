const sortSpeakers = (speakers) =>
  !speakers
    ? undefined
    : speakers
        .sort((a, b) => {
          a = a.data;
          b = b.data;
          if (a.name[0].text < b.name[0].text) {
            return -1;
          }
          if (a.name[0].text > b.name[0].text) {
            return 1;
          }
          return 0;
        })
        .reduce((acc, val) => {
          return {
            ...acc,
            [val.id]: val.data,
          };
        }, {});

export default sortSpeakers;
