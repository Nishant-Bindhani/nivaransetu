import { app } from '@config/app.js'
import { config } from '@config/env.js'

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${config.PORT}`)
})
