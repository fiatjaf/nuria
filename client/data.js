module.exports.fetchEntry = function fetchEntry (id) {
  return Promise.resolve({
    id: id,
    name: id,
    tags: [
      'mjiwl',
      'bileca'
    ],
    comments: [
      {
        content: 'bla blé',
        author: {id: 'fiatjaf', username: 'fiatjaf', picture: 'https://trello-avatars.s3.amazonaws.com/d2f9f8c8995019e2d3fda00f45d939b8/170.png'}
      }
    ],
    users: [{
      id: 'fiatjaf',
      username: 'fiatjaf',
      picture: 'https://trello-avatars.s3.amazonaws.com/d2f9f8c8995019e2d3fda00f45d939b8/170.png'
    }],
    children: [{
      name: 'x',
      id: 'x',
      tags: ['goiaba']
    }, {
      name: 'y',
      id: 'y',
      content: 'ipsilone'
    }, {
      name: 'w',
      id: 'w',
      content: 'dábliu, ou double-you, ou qualquer coisa assim.'
    }]
  })
}

module.exports.addComment = function addComment (entryId, content) {
  return Promise.resolve('xywytwik')
}
