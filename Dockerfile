FROM ubuntu:latest

LABEL maintainer="{jorgehpo, s.castelo, rlopez}@nyu.edu"

RUN apt-get update && apt-get install -y \
  python3 \
  python3-pip \
  unzip \
  curl \
  && pip3 install --upgrade pip

RUN curl -sL https://deb.nodesource.com/setup_10.x| bash

RUN apt-get install -y nodejs

WORKDIR /install_files

ADD . ./

WORKDIR /install_files/PipelineProfiler

RUN npm install 

RUN npm run build 

WORKDIR /install_files

RUN pip3 install .

EXPOSE 8888

RUN echo "#!/bin/bash" >> run.sh \
  & echo "source ~/.bashrc & jupyter notebook --ip=0.0.0.0 --no-browser --allow-root" >> run.sh \
  & chmod +x run.sh

CMD ["./run.sh"]
