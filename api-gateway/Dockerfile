# use the official node.js 18 image with alpine linux as the base image

FROM node:18-alpine

# set the working directory in the container to /usr/src/app
WORKDIR /usr/src/app

# copy the package.json file and package-lock.json file to the container
COPY package*.json ./

# install the dependencies of the application
RUN npm ci --only=production

# copy the rest of the application code to the container
COPY . .

# expose the port that the application will run on
EXPOSE 3000

# run the application
CMD ["node", "src/server.js"]